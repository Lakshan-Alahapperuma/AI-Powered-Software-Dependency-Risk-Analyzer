package com.dependencyrisk.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.dependencyrisk.backend.entity.Dependency;
import com.dependencyrisk.backend.entity.Project;
import com.dependencyrisk.backend.repository.DependencyRepository;
import com.dependencyrisk.backend.repository.ProjectRepository;

@Service
public class DependencyService {

    private final DependencyRepository dependencyRepository;
    private final ProjectRepository projectRepository;

    public DependencyService(
            DependencyRepository dependencyRepository,
            ProjectRepository projectRepository) {

        this.dependencyRepository = dependencyRepository;
        this.projectRepository = projectRepository;
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
}