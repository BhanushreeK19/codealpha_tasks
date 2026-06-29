package com.pmtool.config;

import com.pmtool.entity.Role;
import com.pmtool.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Ensures the three system roles exist on startup, even if schema.sql
 * was not run manually (Hibernate's ddl-auto=update will have created
 * the tables, but seed rows still need to be inserted once).
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        seedRole("ROLE_ADMIN", "Full system access");
        seedRole("ROLE_PROJECT_MANAGER", "Can create and manage projects");
        seedRole("ROLE_MEMBER", "Standard team member");
    }

    private void seedRole(String name, String description) {
        if (roleRepository.findByName(name).isEmpty()) {
            Role role = new Role();
            role.setName(name);
            role.setDescription(description);
            roleRepository.save(role);
        }
    }
}
