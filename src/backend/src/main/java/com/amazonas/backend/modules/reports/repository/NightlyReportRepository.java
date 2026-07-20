package com.amazonas.backend.modules.reports.repository;

import com.amazonas.backend.modules.reports.model.NightlyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface NightlyReportRepository extends JpaRepository<NightlyReport, UUID> {
}
