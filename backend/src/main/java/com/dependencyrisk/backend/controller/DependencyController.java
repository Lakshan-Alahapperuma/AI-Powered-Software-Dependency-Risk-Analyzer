package com.dependencyrisk.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dependencyrisk.backend.entity.Dependency;
import com.dependencyrisk.backend.service.DependencyService;

@RestController
@RequestMapping("/api/projects/{projectId}/dependencies")
public class DependencyController {

    private final DependencyService dependencyService;

    public DependencyController(DependencyService dependencyService) {
        this.dependencyService = dependencyService;
    }

    @PostMapping
    public ResponseEntity<Dependency> addDependency(
            @PathVariable Long projectId,
            @RequestBody Dependency dependency) {

        Dependency savedDependency =
                dependencyService.addDependency(projectId, dependency);

        return ResponseEntity.ok(savedDependency);
    }

    @GetMapping
    public ResponseEntity<List<Dependency>> getDependencies(
            @PathVariable Long projectId) {

        return ResponseEntity.ok(
                dependencyService.getDependenciesByProject(projectId)
        );
    }
}