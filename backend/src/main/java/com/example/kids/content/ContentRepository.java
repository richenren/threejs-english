package com.example.kids.content;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ContentRepository extends JpaRepository<ContentEntity,String> {
 boolean existsByTextIgnoreCase(String text);
}