-- Run only against the verified local campus database. All inserted rows are rolled back.
SET NOCOUNT ON;
SET XACT_ABORT OFF;
BEGIN TRY
    BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM sys.columns c JOIN sys.tables t ON c.object_id = t.object_id
               WHERE t.name LIKE 'tblCoordinatorProforma%' AND c.name LIKE '%Wing%')
        THROW 51000, 'Wing must not be persisted in the proforma schema.', 1;
    IF (SELECT COUNT(*) FROM sys.tables WHERE name LIKE 'tblCoordinatorProforma%') <> 34
        THROW 51000, 'Not all proforma tables were created.', 1;

    DECLARE @Employee int = (SELECT MIN(ID) FROM dbo.tblEmployee);
    IF @Employee IS NULL THROW 51000, 'An existing local employee is needed for FK tests.', 1;
    DECLARE @Now datetime2(3) = SYSUTCDATETIME(), @Rejected bit;
    DECLARE @Actor int, @Report int, @OtherReport int, @Entry int, @Observation int, @Closing int, @Routine int, @Revision int;
    DECLARE @Home varchar(100) = '__schema_test_' + CONVERT(varchar(36), NEWID());
    INSERT dbo.tblCoordinatorProformaActor (HomeCampusKey, PrincipalType, PrincipalId, DisplayNameSnapshot)
        VALUES (@Home, 'Employee', @Employee, N'Schema test');
    SET @Actor = SCOPE_IDENTITY();
    -- The same numeric ID in another home campus is a separate actor.
    INSERT dbo.tblCoordinatorProformaActor (HomeCampusKey, PrincipalType, PrincipalId, DisplayNameSnapshot)
        VALUES (@Home + '_other', 'Employee', @Employee, N'Other campus head');
    DECLARE @Date date = '9998-12-30';
    IF EXISTS (SELECT 1 FROM dbo.tblCoordinatorProformaReport WHERE CoordinatorEmployeeId = @Employee AND ReportDate >= @Date)
        THROW 51000, 'Reserved test dates already contain reports.', 1;
    INSERT dbo.tblCoordinatorProformaReport
        (CoordinatorEmployeeId, ReportDate, WorkflowStatus, CurrentRevisionNumber, TemplateVersion, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
        VALUES (@Employee, @Date, 'Draft', 0, 1, @Now, @Now, @Actor, @Actor);
    SET @Report = SCOPE_IDENTITY();
    INSERT dbo.tblCoordinatorProformaReport
        (CoordinatorEmployeeId, ReportDate, WorkflowStatus, CurrentRevisionNumber, TemplateVersion, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
        VALUES (@Employee, DATEADD(day, 1, @Date), 'Draft', 0, 1, @Now, @Now, @Actor, @Actor);
    SET @OtherReport = SCOPE_IDENTITY();

    SET @Rejected = 0;
    BEGIN TRY
        INSERT dbo.tblCoordinatorProformaReport
            (CoordinatorEmployeeId, ReportDate, WorkflowStatus, CurrentRevisionNumber, TemplateVersion, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
            VALUES (@Employee, @Date, 'Draft', 0, 1, @Now, @Now, @Actor, @Actor);
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'Duplicate coordinator/date was accepted.', 1;

    INSERT dbo.tblCoordinatorProformaSection (ReportId, SectionCode) VALUES (@Report, 'Notebooks');
    INSERT dbo.tblCoordinatorProformaEntry
        (ReportId, SectionCode, SortOrder, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
        VALUES (@Report, 'Notebooks', 0, @Now, @Now, @Actor, @Actor);
    SET @Entry = SCOPE_IDENTITY();

    INSERT dbo.tblCoordinatorProformaSection (ReportId, SectionCode) VALUES (@Report, 'Observation');
    INSERT dbo.tblCoordinatorProformaEntry
        (ReportId, SectionCode, SortOrder, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
        VALUES (@Report, 'Observation', 0, @Now, @Now, @Actor, @Actor);
    SET @Observation = SCOPE_IDENTITY();

    INSERT dbo.tblCoordinatorProformaSection (ReportId, SectionCode) VALUES (@Report, 'Closing');
    INSERT dbo.tblCoordinatorProformaEntry
        (ReportId, SectionCode, SortOrder, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
        VALUES (@Report, 'Closing', 0, @Now, @Now, @Actor, @Actor);
    SET @Closing = SCOPE_IDENTITY();

    INSERT dbo.tblCoordinatorProformaSection (ReportId, SectionCode) VALUES (@Report, 'Routine');
    INSERT dbo.tblCoordinatorProformaEntry
        (ReportId, SectionCode, SortOrder, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
        VALUES (@Report, 'Routine', 0, @Now, @Now, @Actor, @Actor);
    SET @Routine = SCOPE_IDENTITY();

    INSERT dbo.tblCoordinatorProformaNotebookCheck
        (EntryId, SectionCode, TitlePresent, PageNumberingPresent, NeatnessSatisfactory, Mistakes)
        VALUES (@Entry, 'Notebooks', NULL, 0, 1, N'املا کی غلطیاں');
    IF NOT EXISTS (SELECT 1 FROM dbo.tblCoordinatorProformaNotebookCheck WHERE EntryId = @Entry
                   AND TitlePresent IS NULL AND PageNumberingPresent = 0 AND NeatnessSatisfactory = 1 AND Mistakes = N'املا کی غلطیاں')
        THROW 51000, 'Nullable checks or Unicode text did not round-trip.', 1;
    INSERT dbo.tblCoordinatorProformaClassObservation (EntryId, SectionCode) VALUES (@Observation, 'Observation');
    INSERT dbo.tblCoordinatorProformaClosing (EntryId, SectionCode) VALUES (@Closing, 'Closing');
    INSERT dbo.tblCoordinatorProformaCheckResponse (EntryId, SectionCode, CriterionCode, ResponseCode)
        VALUES (@Routine, 'Routine', 'RoutineMoralLessonDelivered', NULL);

    SET @Rejected = 0;
    BEGIN TRY
        INSERT dbo.tblCoordinatorProformaClassObservation (EntryId, SectionCode) VALUES (@Entry, 'Observation');
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'A detail could be attached to the wrong section.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        INSERT dbo.tblCoordinatorProformaClassObservation (EntryId, SectionCode) VALUES (@Entry, 'Notebooks');
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'A detail section discriminator could be forged.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        UPDATE dbo.tblCoordinatorProformaEntry SET ClassSectionId = -2147483647 WHERE Id = @Entry;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'An invalid class reference was accepted.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        INSERT dbo.tblCoordinatorProformaCheckResponse (EntryId, SectionCode, CriterionCode, ResponseCode) VALUES (@Routine, 'Routine', 'ObservationDiscipline', 'Done');
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'A criterion was accepted in the wrong section.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        UPDATE dbo.tblCoordinatorProformaCheckResponse SET ResponseCode = 'Satisfactory' WHERE EntryId = @Routine;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'A routine check accepted an observation-only response.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        UPDATE dbo.tblCoordinatorProformaNotebookCheck SET WritingQualityCode = 'Invalid' WHERE EntryId = @Entry;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'Invalid enum value was accepted.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        INSERT dbo.tblCoordinatorProformaEntry
            (ReportId, SectionCode, SortOrder, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
            VALUES (@Report, 'Closing', 1, @Now, @Now, @Actor, @Actor);
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'Two active Closing entries were accepted.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        UPDATE dbo.tblCoordinatorProformaClosing SET CriticalMatterText = N'Concern' WHERE EntryId = @Closing;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'A closing narrative accepted text without a response state.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        UPDATE dbo.tblCoordinatorProformaClosing SET CriticalMatterState = 'None', CriticalMatterText = N'Concern' WHERE EntryId = @Closing;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'A closing narrative accepted both None and text.', 1;

    UPDATE dbo.tblCoordinatorProformaClosing SET CriticalMatterState = 'None' WHERE EntryId = @Closing;
    UPDATE dbo.tblCoordinatorProformaEntry SET DeletedAtUtc = @Now WHERE Id = @Closing;
    INSERT dbo.tblCoordinatorProformaEntry
        (ReportId, SectionCode, SortOrder, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
        VALUES (@Report, 'Closing', 1, @Now, @Now, @Actor, @Actor);
    INSERT dbo.tblCoordinatorProformaRevision
        (ReportId, RevisionNumber, SubmittedAtUtc, SubmittedByActorId, ActorDisplayNameSnapshot, TemplateVersion, SnapshotSchemaVersion, PrintTemplateVersion, SnapshotJson)
        VALUES (@Report, 1, @Now, @Actor, N'Schema test', 1, 1, 1, N'{"entries":[]}');
    SET @Revision = SCOPE_IDENTITY();

    SET @Rejected = 0;
    BEGIN TRY
        UPDATE dbo.tblCoordinatorProformaRevision SET SnapshotJson = N'not json' WHERE Id = @Revision;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'Malformed revision JSON was accepted.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        INSERT dbo.tblCoordinatorProformaAction
            (ReportId, SourceEntryId, Title, StatusCode, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
            VALUES (@OtherReport, @Entry, N'Invalid link', 'Open', @Now, @Now, @Actor, @Actor);
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'Cross-report action entry reference was accepted.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        INSERT dbo.tblCoordinatorProformaComment
            (ReportId, RevisionId, ActorId, ActorDisplayNameSnapshot, Text, CreatedAtUtc)
            VALUES (@OtherReport, @Revision, @Actor, N'Schema test', N'Invalid link', @Now);
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'Cross-report comment revision reference was accepted.', 1;

    SET @Rejected = 0;
    BEGIN TRY
        INSERT dbo.tblCoordinatorProformaReviewEvent
            (RevisionId, EventCode, ActorId, ActorDisplayNameSnapshot, CreatedAtUtc)
            VALUES (@Revision, 'Returned', @Actor, N'Schema test', @Now);
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (547, 2601, 2627) THROW;
        SET @Rejected = 1;
    END CATCH;
    IF @Rejected = 0 THROW 51000, 'Returning a report without a reason was accepted.', 1;

    INSERT dbo.tblCoordinatorProformaReviewEvent (RevisionId, EventCode, ActorId, ActorDisplayNameSnapshot, CreatedAtUtc)
        VALUES (@Revision, 'Acknowledged', @Actor, N'Schema test', @Now),
               (@Revision, 'Approved', @Actor, N'Schema test', @Now);
    IF (SELECT COUNT(*) FROM dbo.tblCoordinatorProformaReviewEvent WHERE RevisionId = @Revision) <> 2
        THROW 51000, 'Acknowledgement and approval could not be stored independently.', 1;
    INSERT dbo.tblCoordinatorProformaAction
        (ReportId, SourceEntryId, SourceRevisionId, Title, StatusCode, CreatedAtUtc, UpdatedAtUtc, CreatedByActorId, UpdatedByActorId)
        VALUES (@Report, @Entry, @Revision, N'Recheck corrections', 'Open', @Now, @Now, @Actor, @Actor);
    DECLARE @Version binary(8) = (SELECT RowVersion FROM dbo.tblCoordinatorProformaReport WHERE Id = @Report);
    UPDATE dbo.tblCoordinatorProformaReport SET Theme = N'Changed' WHERE Id = @Report;
    IF @Version = (SELECT RowVersion FROM dbo.tblCoordinatorProformaReport WHERE Id = @Report)
        THROW 51000, 'Report rowversion was not advanced.', 1;
    ROLLBACK TRANSACTION;
    SELECT N'PASS: proforma schema constraints, relationships, optional responses, Unicode and rowversion. All test rows rolled back.' AS Result;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
