public with sharing class TaskTrackerController {
    @AuraEnabled(cacheable=true)
    public static List<Task> getTasks() {
        return [
            SELECT Id, Subject, Status, Priority, ActivityDate
            FROM Task
            WHERE IsDeleted = false
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }

    @AuraEnabled
    public static Task createTask(String subject, String status, String priority, Date dueDate) {
        if (String.isBlank(subject)) {
            throw new AuraHandledException('Subject is required.');
        }

        Task t = new Task(
            Subject = subject.trim(),
            Status = String.isBlank(status) ? 'Not Started' : status,
            Priority = String.isBlank(priority) ? 'Normal' : priority,
            ActivityDate = dueDate
        );
        insert t;

        return [
            SELECT Id, Subject, Status, Priority, ActivityDate
            FROM Task
            WHERE Id = :t.Id
            LIMIT 1
        ];
    }

    @AuraEnabled
    public static void markTaskCompleted(Id taskId) {
        if (taskId == null) {
            throw new AuraHandledException('Task Id is required.');
        }

        Task t = [SELECT Id, Status FROM Task WHERE Id = :taskId LIMIT 1];
        t.Status = 'Completed';
        update t;
    }

    @AuraEnabled
    public static void deleteTask(Id taskId) {
        if (taskId == null) {
            throw new AuraHandledException('Task Id is required.');
        }

        Task t = [SELECT Id FROM Task WHERE Id = :taskId LIMIT 1];
        delete t;
    }

    @AuraEnabled
    public static void updateTaskName(Id taskId, String newName) {
        if (taskId == null) {
            throw new AuraHandledException('Task Id is required.');
        }
        if (String.isBlank(newName)) {
            throw new AuraHandledException('Task name is required.');
        }

        Task t = [SELECT Id, Subject FROM Task WHERE Id = :taskId LIMIT 1];
        t.Subject = newName.trim();
        update t;
    }
}
