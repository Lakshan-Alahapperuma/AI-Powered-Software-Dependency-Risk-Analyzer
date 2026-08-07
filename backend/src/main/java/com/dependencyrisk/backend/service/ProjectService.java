package com.dependencyrisk.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.dependencyrisk.backend.entity.Project;
import com.dependencyrisk.backend.repository.ProjectRepository;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public Project createProject(Project project) {
        return projectRepository.save(project);
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public Optional<Project> getProjectById(Long id) {
        return projectRepository.findById(id);
    }
}