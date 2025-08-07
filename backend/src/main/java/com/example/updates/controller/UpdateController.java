package com.example.updates.controller;

import com.example.updates.model.Update;
import com.example.updates.service.UpdateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/updates")
public class UpdateController {

    @Autowired
    private UpdateService updateService;

    @PostMapping
    public ResponseEntity<Update> createUpdate(@RequestBody Update update) {
        return ResponseEntity.ok(updateService.createUpdate(update));
    }

    @GetMapping
    public ResponseEntity<List<Update>> getAllUpdates() {
        return ResponseEntity.ok(updateService.getAllUpdates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Update> getUpdate(@PathVariable Long id) {
        Update update = updateService.getUpdate(id);
        if (update != null) {
            return ResponseEntity.ok(update);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUpdate(@PathVariable Long id) {
        boolean deleted = updateService.deleteUpdate(id);
        if (deleted) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
