package com.dependencyrisk.backend.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.dependencyrisk.backend.entity.Dependency;
import com.dependencyrisk.backend.entity.Vulnerability;
import com.dependencyrisk.backend.repository.DependencyRepository;
import com.dependencyrisk.backend.repository.VulnerabilityRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class OSVService {

    private static final String OSV_API_URL =
            "https://api.osv.dev/v1/query";

    private final DependencyRepository dependencyRepository;
    private final VulnerabilityRepository vulnerabilityRepository;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient;

    public OSVService(
            DependencyRepository dependencyRepository,
            VulnerabilityRepository vulnerabilityRepository,
            ObjectMapper objectMapper) {

        this.dependencyRepository = dependencyRepository;
        this.vulnerabilityRepository = vulnerabilityRepository;
        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newHttpClient();
    }

    @Transactional
    public List<Vulnerability> scanDependency(Long dependencyId)
            throws IOException, InterruptedException {

        Dependency dependency =
                dependencyRepository.findById(dependencyId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Dependency not found: "
                                                + dependencyId));

        /*
         * Build the OSV request.
         *
         * Example:
         *
         * {
         *   "package": {
         *     "name": "lodash",
         *     "ecosystem": "npm"
         *   },
         *   "version": "4.17.20"
         * }
         */

        String requestBody = """
                {
                    "package": {
                        "name": "%s",
                        "ecosystem": "npm"
                    },
                    "version": "%s"
                }
                """.formatted(
                        dependency.getName(),
                        dependency.getVersion()
                );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(OSV_API_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        if (response.statusCode() != 200) {

            throw new RuntimeException(
                    "OSV API returned HTTP "
                            + response.statusCode()
            );
        }

        JsonNode root =
                objectMapper.readTree(response.body());

        /*
         * Remove old vulnerability records for this dependency
         * before saving the latest scan result.
         */

        List<Vulnerability> oldVulnerabilities =
                vulnerabilityRepository
                        .findByDependencyId(dependencyId);

        vulnerabilityRepository.deleteAll(oldVulnerabilities);

        List<Vulnerability> vulnerabilities =
                new ArrayList<>();

        JsonNode vulns = root.get("vulns");

        if (vulns == null || !vulns.isArray()) {
                        updateRisk(dependency, vulnerabilities);
            return vulnerabilities;
        }

        for (JsonNode vuln : vulns) {

            String vulnerabilityId =
                    getText(vuln, "id");

            String summary =
                    getText(vuln, "summary");

            String published =
                    getText(vuln, "published");

            String modified =
                    getText(vuln, "modified");

            String severity =
                    extractSeverity(vuln);

            String cvssScore =
                    extractCvssScore(vuln);

            Vulnerability vulnerability =
                    new Vulnerability(
                            vulnerabilityId,
                            summary,
                            severity,
                            cvssScore,
                            published,
                            modified,
                            dependency
                    );

            vulnerabilities.add(vulnerability);
        }

        List<Vulnerability> savedVulnerabilities =
                vulnerabilityRepository.saveAll(vulnerabilities);

        updateRisk(dependency, savedVulnerabilities);
        return savedVulnerabilities;
    }

    public List<Vulnerability> getVulnerabilities(
            Long dependencyId) {

        return vulnerabilityRepository
                .findByDependencyId(dependencyId);
    }

        private void updateRisk(
                        Dependency dependency,
                        List<Vulnerability> vulnerabilities) {

                int findingCount = vulnerabilities.size();
                double riskScore = Math.min(
                                100,
                                vulnerabilities.stream()
                                                .mapToDouble(vulnerability ->
                                                                riskPoints(vulnerability.getSeverity()))
                                                .sum());

                dependency.setRiskScore(riskScore);
                dependency.setRiskLevel(riskLevelFor(riskScore));
                dependencyRepository.save(dependency);
        }

        private String riskLevelFor(double riskScore) {
                if (riskScore == 0) {
                        return "LOW";
                }
                if (riskScore < 50) {
                        return "MEDIUM";
                }
                return "HIGH";
        }

    private String getText(
            JsonNode node,
            String fieldName) {

        JsonNode value = node.get(fieldName);

        if (value == null || value.isNull()) {
            return null;
        }

        return value.asString();
    }

    private String extractSeverity(JsonNode vulnerability) {

                JsonNode databaseSpecific =
                                vulnerability.get("database_specific");

                if (databaseSpecific != null) {
                        String severity = getText(databaseSpecific, "severity");
                        if (severity != null) {
                                return severity.toUpperCase();
                        }
                }

        JsonNode severityNode =
                vulnerability.get("severity");

        if (severityNode == null ||
                !severityNode.isArray()) {

            return null;
        }

        if (severityNode.size() == 0) {
            return null;
        }

        JsonNode firstSeverity =
                severityNode.get(0);

        JsonNode type =
                firstSeverity.get("type");

        if (type != null) {
            return type.asString();
        }

        return null;
    }

        private double riskPoints(String severity) {
                if (severity == null) {
                        return 20;
                }

                return switch (severity.toUpperCase()) {
                        case "CRITICAL" -> 35;
                        case "HIGH" -> 25;
                        case "MODERATE", "MEDIUM" -> 15;
                        case "LOW" -> 5;
                        default -> 20;
                };
        }

    private String extractCvssScore(JsonNode vulnerability) {

        JsonNode severityNode =
                vulnerability.get("severity");

        if (severityNode == null ||
                !severityNode.isArray()) {

            return null;
        }

        for (JsonNode severity : severityNode) {

            JsonNode score =
                    severity.get("score");

            if (score != null) {
                return score.asString();
            }
        }

        return null;
    }
}