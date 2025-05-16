import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService, AccountDetails, TransferResponse, Transaction } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css'],
  standalone: false
})
export class TransactionComponent implements OnInit {
  transactionForm: FormGroup;
  loading = false;
  recipientLoading = false;
  recipientName: string | null = null;
  recipientError: string | null = null;
  successMessage: string | null = null;
  error: string | null = null;
  success: string | null = null;
  transactions: Transaction[] = [];
  accountValidated = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.transactionForm = this.fb.group({
      toAccount: ['', [
        Validators.required, 
        Validators.pattern('^BANK[A-Z0-9]{6}$')
      ]],
      amount: ['', [
        Validators.required, 
        Validators.min(1),
        Validators.max(100000)
      ]],
      description: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(100)
      ]]
    });
  }

  ngOnInit() {
    // Set up recipient lookup when account number changes
    this.transactionForm.get('toAccount')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(accountNumber => {
        this.accountValidated = false;
        this.recipientName = null;
        this.recipientError = null;

        if (!accountNumber) {
          return of(null);
        }

        if (!accountNumber.match('^BANK[A-Z0-9]{6}$')) {
          this.recipientError = 'Invalid account number format. Should be BANK followed by 6 characters.';
          return of(null);
        }

        const currentUser = this.authService.getUser();
        if (currentUser && accountNumber === currentUser.accountNumber) {
          this.recipientError = 'Cannot transfer to your own account.';
          return of(null);
        }

        this.recipientLoading = true;
        return this.apiService.getAccountDetails(accountNumber).pipe(
          catchError(error => {
            if (error.status === 404) {
              this.recipientError = 'Account not found. Please check the account number.';
            } else if (error.status === 401) {
              this.recipientError = 'Unauthorized. Please log in again.';
            } else {
              this.recipientError = error.error?.message || 'Failed to verify account. Please try again.';
            }
            return of(null);
          })
        );
      })
    ).subscribe((response: AccountDetails | null) => {
      this.recipientLoading = false;
      if (response) {
        this.recipientName = response.accountHolderName;
        this.recipientError = null;
        this.accountValidated = true;
      }
    });

    // Load initial transactions
    this.loadTransactions();
  }

  onSubmit() {
    if (!this.accountValidated) {
      this.error = 'Please enter a valid recipient account number.';
      return;
    }

    if (this.transactionForm.valid && !this.recipientError && this.recipientName) {
      this.loading = true;
      this.success = null;
      this.error = null;
      const formData = this.transactionForm.value;

      // Additional validation
      if (formData.amount <= 0) {
        this.error = 'Amount must be greater than 0';
        this.loading = false;
        return;
      }

      if (formData.amount > 100000) {
        this.error = 'Amount cannot exceed ₹100,000';
        this.loading = false;
        return;
      }

      if (formData.description.length > 100) {
        this.error = 'Description cannot exceed 100 characters';
        this.loading = false;
        return;
      }
      
      this.apiService.transfer({
        destinationAccountNumber: formData.toAccount,
        amount: formData.amount,
        description: formData.description
      }).subscribe({
        next: (response: TransferResponse) => {
          this.loading = false;
          this.success = `Successfully transferred ₹${formData.amount} to ${this.recipientName}`;
          this.transactionForm.reset();
          this.recipientName = null;
          this.accountValidated = false;
          this.loadTransactions();
          setTimeout(() => {
            this.success = null;
          }, 5000);
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 404) {
            this.error = 'Account not found. Please check the account number.';
          } else if (error.status === 401) {
            this.error = 'Unauthorized. Please log in again.';
          } else if (error.status === 400) {
            this.error = error.error?.message || 'Invalid transaction details. Please check and try again.';
          } else if (error.status === 403) {
            this.error = 'Insufficient funds or transaction limit exceeded.';
          } else {
            this.error = 'Transfer failed. Please try again later.';
          }
        }
      });
    } else {
      this.handleFormErrors();
    }
  }

  private handleFormErrors() {
    const toAccountControl = this.transactionForm.get('toAccount');
    const amountControl = this.transactionForm.get('amount');
    const descriptionControl = this.transactionForm.get('description');

    if (toAccountControl?.errors) {
      if (toAccountControl.errors['required']) {
        this.error = 'Account number is required';
      } else if (toAccountControl.errors['pattern']) {
        this.error = 'Invalid account number format. Should be BANK followed by 6 characters.';
      }
    } else if (amountControl?.errors) {
      if (amountControl.errors['required']) {
        this.error = 'Amount is required';
      } else if (amountControl.errors['min']) {
        this.error = 'Amount must be greater than 0';
      } else if (amountControl.errors['max']) {
        this.error = 'Amount cannot exceed ₹100,000';
      }
    } else if (descriptionControl?.errors) {
      if (descriptionControl.errors['required']) {
        this.error = 'Description is required';
      } else if (descriptionControl.errors['minlength']) {
        this.error = 'Description must be at least 3 characters';
      } else if (descriptionControl.errors['maxlength']) {
        this.error = 'Description cannot exceed 100 characters';
      }
    }
  }

  private loadTransactions() {
    const currentUser = this.authService.getUser();
    if (currentUser?.accountNumber) {
      this.apiService.getTransactionHistory(currentUser.accountNumber).subscribe({
        next: (transactions: Transaction[]) => {
          this.transactions = transactions;
        },
        error: (error: Error) => {
          console.error('Error loading transactions:', error);
        }
      });
    }
  }

  onDateRangeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    // TODO: Implement date range filtering
    console.log('Selected date range:', value);
  }

  formatAmount(amount: number, type: string): string {
    return `${type === 'DEBIT' ? '-' : '+'} ₹${amount.toFixed(2)}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

