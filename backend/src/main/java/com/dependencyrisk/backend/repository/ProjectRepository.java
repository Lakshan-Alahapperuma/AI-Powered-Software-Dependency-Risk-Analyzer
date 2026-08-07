package com.dependencyrisk.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dependencyrisk.backend.entity.Project;

public interface ProjectRepository extends JpaRepository<Project, Long> {
}