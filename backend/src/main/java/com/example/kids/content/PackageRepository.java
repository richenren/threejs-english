package com.example.kids.content;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface PackageRepository extends JpaRepository<PackageEntity,String>{
 Optional<PackageEntity> findFirstByOrderByPublishedAtDesc();
}