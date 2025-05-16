import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-statement',
  standalone: false,
  templateUrl: './statement.component.html',
  styleUrl: './statement.component.css'
})
export class StatementComponent implements OnInit {
  statementForm: FormGroup;
  isLoading = false;
  error = '';
  today = new Date().toISOString().split('T')[0];
  accountNumber = '';
  transactions: any[] = [];

  constructor(
    private fb: FormBuilder, 
    private apiService: ApiService,
    private authService: AuthService,
    public router: Router
  ) {
    this.statementForm = this.fb.group({
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required]
    });
  }

  ngOnInit() {
    const currentUser = this.authService.getUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.accountNumber = currentUser.accountNumber;
  }

  downloadStatement() {
    this.error = '';
    if (!this.accountNumber) {
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.statementForm.valid) {
      this.isLoading = true;
      const fromDate = this.statementForm.get('fromDate')?.value;
      const toDate = this.statementForm.get('toDate')?.value;
      
      // Format dates to YYYY-MM-DD
      const formattedFromDate = this.formatDate(fromDate);
      const formattedToDate = this.formatDate(toDate);
      
      this.apiService.downloadStatement(this.accountNumber, formattedFromDate, formattedToDate).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `statement_${this.accountNumber}_${formattedFromDate}_to_${formattedToDate}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.isLoading = false;
        },
        error: (err) => {
          if (err.status === 401) {
            this.router.navigate(['/login']);
          } else {
            this.error = err.error?.message || 'Failed to download statement.';
          }
          this.isLoading = false;
        }
      });
    }
  }

  getTransactionsForRange() {
    this.error = '';
    if (!this.accountNumber) {
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.statementForm.valid) {
      this.isLoading = true;
      const fromDate = this.statementForm.get('fromDate')?.value;
      const toDate = this.statementForm.get('toDate')?.value;
      
      // Format dates to YYYY-MM-DD
      const formattedFromDate = this.formatDate(fromDate);
      const formattedToDate = this.formatDate(toDate);
      
      this.apiService.getTransactionHistoryForRange(this.accountNumber, formattedFromDate, formattedToDate).subscribe({
        next: (data: any[]) => {
          this.transactions = data;
          this.isLoading = false;
        },
        error: (err) => {
          if (err.status === 401) {
            this.router.navigate(['/login']);
          } else {
            this.error = err.error?.message || 'Failed to fetch transactions.';
          }
          this.isLoading = false;
        }
      });
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
