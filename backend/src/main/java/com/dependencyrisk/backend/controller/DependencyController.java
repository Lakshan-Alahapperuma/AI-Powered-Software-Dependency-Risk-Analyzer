package com.dependencyrisk.backend.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.dependencyrisk.backend.entity.Dependency;
import com.dependencyrisk.backend.entity.Vulnerability;
import com.dependencyrisk.backend.service.DependencyService;
import com.dependencyrisk.backend.service.OSVService;

@RestController
@RequestMapping("/api/projects/{projectId}/dependencies")
@CrossOrigin(origins = "*")
public class DependencyController {

    private final DependencyService dependencyService;
    private final OSVService osvService;

    public DependencyController(
        DependencyService dependencyService,
        OSVService osvService) {

    this.dependencyService = dependencyService;
    this.osvService = osvService;
}

    @PostMapping
    public ResponseEntity<Dependency> addDependency(
            @PathVariable Long projectId,
            @RequestBody Dependency dependency) {

        Dependency savedDependency =
                dependencyService.addDependency(
                        projectId,
                        dependency);

        return ResponseEntity.ok(savedDependency);
    }

    @GetMapping
    public ResponseEntity<List<Dependency>> getDependencies(
            @PathVariable Long projectId) {

        return ResponseEntity.ok(
                dependencyService
                        .getDependenciesByProject(projectId)
        );
    }

    @PostMapping("/upload")
    public ResponseEntity<List<Dependency>> uploadPackageJson(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file)
            throws IOException {

        List<Dependency> dependencies =
                dependencyService.uploadPackageJson(
                        projectId,
                        file);

        return ResponseEntity.ok(dependencies);
    }

    @PostMapping("/{dependencyId}/scan")
    public ResponseEntity<List<Vulnerability>> scanDependency(
        @PathVariable Long projectId,
        @PathVariable Long dependencyId)
        throws IOException, InterruptedException {

    List<Vulnerability> vulnerabilities =
            osvService.scanDependency(dependencyId);

    return ResponseEntity.ok(vulnerabilities);
}

@GetMapping("/{dependencyId}/vulnerabilities")
public ResponseEntity<List<Vulnerability>> getVulnerabilities(
        @PathVariable Long projectId,
        @PathVariable Long dependencyId) {

    return ResponseEntity.ok(
            osvService.getVulnerabilities(dependencyId)
    );
}

    @PostMapping("/scan-all")
    public ResponseEntity<List<Dependency>> scanAllDependencies(
        @PathVariable Long projectId)
        throws IOException, InterruptedException {

        List<Dependency> dependencies =
            dependencyService.getDependenciesByProject(projectId);

        for (Dependency dependency : dependencies) {
        osvService.scanDependency(dependency.getId());
        }

        return ResponseEntity.ok(
            dependencyService.getDependenciesByProject(projectId)
        );
    }
}