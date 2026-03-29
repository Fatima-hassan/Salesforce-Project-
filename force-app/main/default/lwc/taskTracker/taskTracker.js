import { LightningElement, track, wire } from 'lwc';
import getTasks from '@salesforce/apex/TaskTrackerController.getTasks';
import createTask from '@salesforce/apex/TaskTrackerController.createTask';
import markTaskCompleted from '@salesforce/apex/TaskTrackerController.markTaskCompleted';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class TaskTracker extends LightningElement {
    @track subject = '';
    @track status = 'Not Started';
    @track priority = 'Normal';
    @track dueDate;

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
        return this.tasks
            .filter((task) => task.Status !== 'Completed')
            .map((task) => ({ ...task, rowClass: 'task-row pending' }));
    }

    get completedTasks() {
        return this.tasks
            .filter((task) => task.Status === 'Completed')
            .map((task) => ({ ...task, rowClass: 'task-row completed' }));
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
            this.showToast('Success', 'Task created.', 'success');
        } catch (error) {
            this.showToast('Error', this.extractError(error), 'error');
        }
    }

    async handleMarkCompleted(event) {
        const taskId = event.currentTarget.dataset.id;
        try {
            await markTaskCompleted({ taskId });
            await refreshApex(this.wiredTaskResult);
            this.showToast('Success', 'Task marked completed.', 'success');
        } catch (error) {
            this.showToast('Error', this.extractError(error), 'error');
        }
    }

    extractError(error) {
        return error?.body?.message || 'Unexpected error occurred.';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
