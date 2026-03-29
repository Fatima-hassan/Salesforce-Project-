@IsTest
private class TaskTrackerControllerTest {
    @IsTest
    static void testCreateAndLoadTasks() {
        Test.startTest();
        Task createdTask = TaskTrackerController.createTask('Creatathon Task', 'Not Started', 'Normal', Date.today().addDays(1));
        List<Task> tasks = TaskTrackerController.getTasks();
        Test.stopTest();

        System.assertNotEquals(null, createdTask.Id, 'Created task should have an Id.');
        System.assert(tasks.size() > 0, 'Task list should not be empty.');
    }

    @IsTest
    static void testMarkTaskCompleted() {
        Task t = new Task(
            Subject = 'Complete me',
            Status = 'In Progress',
            Priority = 'Normal',
            ActivityDate = Date.today()
        );
        insert t;

        Test.startTest();
        TaskTrackerController.markTaskCompleted(t.Id);
        Test.stopTest();

        Task updated = [SELECT Status FROM Task WHERE Id = :t.Id LIMIT 1];
        System.assertEquals('Completed', updated.Status, 'Task should be marked completed.');
    }

    @IsTest
    static void testDeleteTask() {
        Task t = new Task(
            Subject = 'Delete me',
            Status = 'Not Started',
            Priority = 'Normal',
            ActivityDate = Date.today()
        );
        insert t;

        Test.startTest();
        TaskTrackerController.deleteTask(t.Id);
        Test.stopTest();

        Integer remaining = [SELECT COUNT() FROM Task WHERE Id = :t.Id ALL ROWS];
        System.assertEquals(0, remaining, 'Task should be deleted.');
    }

    @IsTest
    static void testUpdateTaskName() {
        Task t = new Task(
            Subject = 'Old name',
            Status = 'Not Started',
            Priority = 'Normal',
            ActivityDate = Date.today()
        );
        insert t;

        Test.startTest();
        TaskTrackerController.updateTaskName(t.Id, 'Updated name');
        Test.stopTest();

        Task updated = [SELECT Subject FROM Task WHERE Id = :t.Id LIMIT 1];
        System.assertEquals('Updated name', updated.Subject, 'Task subject should be updated.');
    }

    @IsTest
    static void testUpdateTaskDueDate() {
        Task t = new Task(
            Subject = 'Date update',
            Status = 'Not Started',
            Priority = 'Normal',
            ActivityDate = Date.today()
        );
        insert t;

        Date newDate = Date.today().addDays(5);
        Test.startTest();
        TaskTrackerController.updateTaskDueDate(t.Id, newDate);
        Test.stopTest();

        Task updated = [SELECT ActivityDate FROM Task WHERE Id = :t.Id LIMIT 1];
        System.assertEquals(newDate, updated.ActivityDate, 'Task due date should be updated.');
    }
}
