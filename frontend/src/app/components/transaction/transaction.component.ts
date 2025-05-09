import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { AccountService } from '../../services/account.service';
import { ChartOptions, ChartType, ChartData } from 'chart.js';

@Component({
  selector: 'app-transaction',
  standalone: false,
  templateUrl: './transaction.component.html',
  styleUrl: './transaction.component.css'
})
export class TransactionComponent implements OnInit {
  transferForm: FormGroup;
  transactions: Transaction[] = [];
  loading: boolean = false;
  error: string | null = null;
  success: string | null = null;
  public accountNumber: string = '';
  recipientName: string | null = null;
  showConfirmation: boolean = false;
  confirmationDetails: any = null;
  // Chart properties for Spending Overview
  public spendingChartData: ChartData<'doughnut'> = {
    labels: ['Received', 'Sent', 'Groceries', 'Other'],
    datasets: [
      {
        data: [20, 35, 30, 15], // Example data, replace with real data
        backgroundColor: ['#2196f3', '#43b96f', '#f09819', '#ff5858'],
        borderColor: '#fff',
        borderWidth: 2
      }
    ]
  };
  public spendingChartType: ChartType = 'doughnut';
  public spendingChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    }
  };
  sentToday: number = 0; // Example value, replace with real logic
  dailyLimit: number = 100000; // Example value, replace with real logic

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private router: Router,
    private accountService: AccountService
  ) {
    this.transferForm = this.fb.group({
      recipientAccount: ['', [Validators.required, Validators.pattern('^BANK[a-zA-Z0-9]{6}$')]],
      amount: ['', [Validators.required, Validators.min(1)]],
      description: ['', Validators.required]
    });

    this.transferForm.get('recipientAccount')?.valueChanges.subscribe(accountNumber => {
      this.recipientName = null;
      if (this.transferForm.get('recipientAccount')?.valid) {
        this.accountService.getAccountDetails(accountNumber).subscribe({
          next: (details) => {
            this.recipientName = details.accountHolderName;
          },
          error: () => {
            this.recipientName = null;
          }
        });
      }
    });
  }

  ngOnInit(): void {
    this.accountNumber = localStorage.getItem('accountNumber') || '';
    this.loadTransactions();
  }

  onSubmit(): void {
    if (this.transferForm.valid) {
      this.loading = true;
      this.error = null;
      this.success = null;
      this.showConfirmation = false;
      this.confirmationDetails = null;

      const accountNumber = localStorage.getItem('accountNumber');
      if (!accountNumber) {
        this.router.navigate(['/login']);
        return;
      }

      const transferData = {
        destinationAccountNumber: this.transferForm.value.recipientAccount,
        amount: this.transferForm.value.amount,
        description: this.transferForm.value.description
      };

      this.transactionService.transfer(transferData).subscribe({
        next: (response) => {
          this.success = 'Transfer successful!';
          this.confirmationDetails = {
            recipientAccount: this.transferForm.value.recipientAccount,
            recipientName: this.recipientName,
            amount: this.transferForm.value.amount,
            description: this.transferForm.value.description,
            transactionId: response.transactionId
          };
          this.showConfirmation = true;
          this.transferForm.reset();
          this.recipientName = null;
          this.loadTransactions();
        },
        error: (error) => {
          this.error = error.error?.message || 'Transfer failed. Please try again.';
        },
        complete: () => {
          this.loading = false;
        }
      });
    }
  }

  onDateRangeChange(event: Event): void {
    const days = (event.target as HTMLSelectElement).value;
    this.loadTransactions(parseInt(days));
  }

  private loadTransactions(days: number = 7): void {
    const accountNumber = localStorage.getItem('accountNumber');
    if (!accountNumber) {
      this.router.navigate(['/login']);
      return;
    }

    this.transactionService.getTransactions(accountNumber, days).subscribe({
      next: (data) => {
        this.transactions = data;
      },
      error: (error) => {
        this.error = 'Failed to load transactions';
        console.error('Error loading transactions:', error);
      }
    });
  }
}

