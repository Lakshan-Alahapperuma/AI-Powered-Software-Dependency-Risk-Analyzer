package com.dependencyrisk.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dependencyrisk.backend.entity.Dependency;

public interface DependencyRepository extends JpaRepository<Dependency, Long> {

    List<Dependency> findByProjectId(Long projectId);

    void deleteByProjectId(Long projectId);
}