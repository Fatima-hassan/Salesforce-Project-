import { LightningElement, track, wire } from 'lwc';
import getTasks from '@salesforce/apex/TaskTrackerController.getTasks';
import createTask from '@salesforce/apex/TaskTrackerController.createTask';
import markTaskCompleted from '@salesforce/apex/TaskTrackerController.markTaskCompleted';
import deleteTask from '@salesforce/apex/TaskTrackerController.deleteTask';
import updateTaskName from '@salesforce/apex/TaskTrackerController.updateTaskName';
import updateTaskDueDate from '@salesforce/apex/TaskTrackerController.updateTaskDueDate';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class TaskTracker extends LightningElement {
    @track subject = '';
    @track status = 'Not Started';
    @track priority = 'Normal';
    @track dueDate;
    @track showOnlyPending = false;
    @track editingTaskId = null;
    @track editingTaskName = '';
    @track editingDueDateTaskId = null;
    @track editingDueDateValue = '';

    wiredTaskResult;
    @track tasks = [];

    @wire(getTasks)
    wiredTasks(result) {
        this.wiredTaskResult = result;
        if (result.data) {
            this.tasks = result.data;
        } else if (result.error) {
            this.showToast('Error', 'Unable to load tasks.', 'error');
        }
    }

    get pendingTasks() {
        // Compute row state client-side so overdue updates without Apex changes.
        return this.tasks
            .filter((task) => task.Status !== 'Completed')
            .map((task) => {
                const isOverdue = this.isTaskOverdue(task);
                return {
                    ...task,
                    isOverdue,
                    rowClass: isOverdue ? 'task-row overdue' : 'task-row pending',
                    dueDateDisplay: this.formatDueDate(task.ActivityDate),
                    isEditing: this.editingTaskId === task.Id,
                    isEditingDueDate: this.editingDueDateTaskId === task.Id
                };
            });
    }

    get completedTasks() {
        return this.tasks
            .filter((task) => task.Status === 'Completed')
            .map((task) => ({
                ...task,
                rowClass: 'task-row completed',
                dueDateDisplay: this.formatDueDate(task.ActivityDate),
                isEditing: this.editingTaskId === task.Id,
                isEditingDueDate: this.editingDueDateTaskId === task.Id
            }));
    }

    get totalCount() {
        return this.tasks.length;
    }

    get pendingCount() {
        return this.pendingTasks.length;
    }

    get completedCount() {
        return this.completedTasks.length;
    }

    get hasPendingTasks() {
        return this.pendingTasks.length > 0;
    }

    get hasCompletedTasks() {
        return this.completedTasks.length > 0;
    }

    get showCompletedSection() {
        return !this.showOnlyPending;
    }

    statusOptions = [
        { label: 'Not Started', value: 'Not Started' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Completed', value: 'Completed' }
    ];

    priorityOptions = [
        { label: 'High', value: 'High' },
        { label: 'Normal', value: 'Normal' },
        { label: 'Low', value: 'Low' }
    ];

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    handlePendingToggle(event) {
        this.showOnlyPending = event.target.checked;
    }

    async handleCreateTask() {
        if (!this.subject || !this.subject.trim()) {
            this.showToast('Validation', 'Task subject is required.', 'warning');
            return;
        }

        try {
            await createTask({
                subject: this.subject,
                status: this.status,
                priority: this.priority,
                dueDate: this.dueDate || null
            });

            this.subject = '';
            this.status = 'Not Started';
            this.priority = 'Normal';
            this.dueDate = null;

            await refreshApex(this.wiredTaskResult);
            this.showToast('Success', 'Task created', 'success');
        } catch (error) {
            this.showToast('Error', this.extractError(error), 'error');
        }
    }

    async handleMarkCompleted(event) {
        const taskId = event.currentTarget.dataset.id;
        try {
            await markTaskCompleted({ taskId });
            await refreshApex(this.wiredTaskResult);
            this.showToast('Success', 'Task completed', 'success');
        } catch (error) {
            this.showToast('Error', this.extractError(error), 'error');
        }
    }

    async handleDeleteTask(event) {
        const taskId = event.currentTarget.dataset.id;
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            await deleteTask({ taskId });
            await refreshApex(this.wiredTaskResult);
            this.showToast('Success', 'Task deleted', 'success');
        } catch (error) {
            this.showToast('Error', this.extractError(error), 'error');
        }
    }

    handleTaskNameActivate(event) {
        const taskId = event.currentTarget.dataset.id;
        const taskName = event.currentTarget.dataset.subject;
        this.startEditing(taskId, taskName);
    }

    handleTaskNameKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const taskId = event.currentTarget.dataset.id;
            const taskName = event.currentTarget.dataset.subject;
            this.startEditing(taskId, taskName);
        }
    }

    handleEditingNameChange(event) {
        this.editingTaskName = event.target.value;
    }

    async handleSaveTaskName() {
        if (!this.editingTaskId) {
            return;
        }
        if (!this.editingTaskName || !this.editingTaskName.trim()) {
            this.showToast('Validation', 'Task name is required.', 'warning');
            return;
        }

        try {
            await updateTaskName({
                taskId: this.editingTaskId,
                newName: this.editingTaskName
            });
            await refreshApex(this.wiredTaskResult);
            this.cancelEditing();
            this.showToast('Success', 'Task name updated', 'success');
        } catch (error) {
            this.showToast('Error', this.extractError(error), 'error');
        }
    }

    handleEditingKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.handleSaveTaskName();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.cancelEditing();
        }
    }

    handleCancelEditing() {
        this.cancelEditing();
    }

    handleDueDateActivate(event) {
        const taskId = event.currentTarget.dataset.id;
        const currentDueDate = event.currentTarget.dataset.duedate;
        this.startEditingDueDate(taskId, currentDueDate);
    }

    handleDueDateKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const taskId = event.currentTarget.dataset.id;
            const currentDueDate = event.currentTarget.dataset.duedate;
            this.startEditingDueDate(taskId, currentDueDate);
        }
    }

    handleEditingDueDateChange(event) {
        this.editingDueDateValue = event.target.value;
    }

    async handleSaveDueDate() {
        if (!this.editingDueDateTaskId) {
            return;
        }

        try {
            await updateTaskDueDate({
                taskId: this.editingDueDateTaskId,
                newDueDate: this.editingDueDateValue || null
            });
            await refreshApex(this.wiredTaskResult);
            this.cancelDueDateEditing();
            this.showToast('Success', 'Task due date updated', 'success');
        } catch (error) {
            this.showToast('Error', this.extractError(error), 'error');
        }
    }

    handleEditingDueDateKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.handleSaveDueDate();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.cancelDueDateEditing();
        }
    }

    handleCancelDueDateEditing() {
        this.cancelDueDateEditing();
    }

    extractError(error) {
        return error?.body?.message || 'Unexpected error occurred.';
    }

    isTaskOverdue(task) {
        if (!task?.ActivityDate || task.Status === 'Completed') {
            return false;
        }
        const today = new Date().toISOString().split('T')[0];
        return task.ActivityDate < today;
    }

    formatDueDate(activityDate) {
        if (!activityDate) {
            return 'No due date';
        }
        const parsedDate = new Date(activityDate);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }).format(parsedDate);
    }

    startEditing(taskId, taskName) {
        this.cancelDueDateEditing();
        this.editingTaskId = taskId;
        this.editingTaskName = taskName;
        // Move focus into the inline input after rerender.
        setTimeout(() => {
            const input = this.template.querySelector('lightning-input[data-editing-input="true"]');
            if (input) {
                input.focus();
            }
        }, 0);
    }

    cancelEditing() {
        this.editingTaskId = null;
        this.editingTaskName = '';
    }

    startEditingDueDate(taskId, currentDueDate) {
        this.cancelEditing();
        this.editingDueDateTaskId = taskId;
        this.editingDueDateValue = currentDueDate || '';
        // Move focus into due date editor after rerender.
        setTimeout(() => {
            const input = this.template.querySelector('lightning-input[data-editing-due-date-input="true"]');
            if (input) {
                input.focus();
            }
        }, 0);
    }

    cancelDueDateEditing() {
        this.editingDueDateTaskId = null;
        this.editingDueDateValue = '';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant,
                mode: 'pester'
            })
        );
    }
}
