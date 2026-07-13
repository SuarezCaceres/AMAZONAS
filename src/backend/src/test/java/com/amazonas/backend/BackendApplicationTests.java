package com.amazonas.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.vendors.repository.VendorRepository;

@SpringBootTest
class BackendApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Test
    void contextLoads() {
        System.out.println("=================================================");
        System.out.println("DEBUGGING USERS AND VENDORS TABLES:");
        
        System.out.println("--- USERS (CLIENTS) ---");
        userRepository.findAll().forEach(user -> 
            System.out.println("Email: " + user.getEmail() + " | Role: " + user.getRole() + " | ID: " + user.getId())
        );

        System.out.println("--- VENDORS (ADMINS) ---");
        vendorRepository.findAll().forEach(vendor -> 
            System.out.println("Email: " + vendor.getEmail() + " | Role: " + vendor.getRole() + " | ID: " + vendor.getId())
        );
        System.out.println("=================================================");
    }

}
