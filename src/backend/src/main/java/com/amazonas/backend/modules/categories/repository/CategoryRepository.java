package com.amazonas.backend.modules.categories.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.amazonas.backend.modules.categories.model.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, String> {
    Optional<Category> findByNombreIgnoreCase(String nombre);
    List<Category> findAllByOrderByOrdenAsc();
}
