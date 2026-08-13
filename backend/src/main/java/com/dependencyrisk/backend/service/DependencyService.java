package com.dependencyrisk.backend.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.dependencyrisk.backend.entity.Dependency;
import com.dependencyrisk.backend.entity.Project;
import com.dependencyrisk.backend.repository.DependencyRepository;
import com.dependencyrisk.backend.repository.ProjectRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;



@Service
public class DependencyService {

    private final DependencyRepository dependencyRepository;
    private final ProjectRepository projectRepository;
    private final ObjectMapper objectMapper;

    public DependencyService(
            DependencyRepository dependencyRepository,
            ProjectRepository projectRepository,
            ObjectMapper objectMapper) {

        this.dependencyRepository = dependencyRepository;
        this.projectRepository = projectRepository;
        this.objectMapper = objectMapper;
    }

    public Dependency addDependency(Long projectId, Dependency dependency) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found with id: " + projectId));

        dependency.setProject(project);

        return dependencyRepository.save(dependency);
    }

    public List<Dependency> getDependenciesByProject(Long projectId) {
        return dependencyRepository.findByProjectId(projectId);
    }

    public List<Dependency> uploadPackageJson(
            Long projectId,
            MultipartFile file) throws IOException {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found with id: " + projectId));

                        dependencyRepository.deleteByProjectId(projectId);

        JsonNode root = objectMapper.readTree(file.getInputStream());

        List<Dependency> dependencies = new ArrayList<>();

        JsonNode normalDependencies = root.get("dependencies");

        if (normalDependencies != null && normalDependencies.isObject()) {
            extractDependencies(
                    normalDependencies,
                    project,
                    dependencies
            );
        }

        JsonNode devDependencies = root.get("devDependencies");

        if (devDependencies != null && devDependencies.isObject()) {
            extractDependencies(
                    devDependencies,
                    project,
                    dependencies
            );
        }

        return dependencyRepository.saveAll(dependencies);
    }

    private void extractDependencies(
            JsonNode dependencyNode,
            Project project,
            List<Dependency> dependencies) {

        for (Map.Entry<String, JsonNode> entry : dependencyNode.properties()) {

    String packageName = entry.getKey();
    String version = entry.getValue().asString();

    version = cleanVersion(version);

    Dependency dependency =
            new Dependency(packageName, version, project);

    dependencies.add(dependency);
}
    }

    private String cleanVersion(String version) {

        if (version == null) {
            return null;
        }

        return version
                .replace("^", "")
                .replace("~", "")
                .trim();
    }
}