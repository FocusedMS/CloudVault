import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-fixed-deposit',
  standalone: false,
  templateUrl: './fixed-deposit.component.html',
  styleUrl: './fixed-deposit.component.css'
})
export class FixedDepositComponent implements OnInit {
  fdForm!: FormGroup;
  fds: any[] = [];
  isLoading = false;
  isListLoading = false;
  message = '';
  error = '';
  accountNumber = '';

  constructor(
    private fb: FormBuilder, 
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getUser();
    this.accountNumber = currentUser?.accountNumber || '';
    console.log('Account Number from Auth:', this.accountNumber);
    this.fdForm = this.fb.group({
      principalAmount: [null, [Validators.required, Validators.min(500)]],
      termMonths: [6, [Validators.required, Validators.min(6)]]
    });
    if (this.accountNumber) {
      this.fetchFDs();
    }
  }

  fetchFDs() {
    this.isListLoading = true;
    this.apiService.getFixedDeposits(this.accountNumber).subscribe({
      next: (data: any) => {
        this.fds = data;
        this.isListLoading = false;
      },
      error: () => {
        this.fds = [];
        this.isListLoading = false;
      }
    });
  }

  onSubmit() {
    this.message = '';
    this.error = '';
    if (this.fdForm.valid) {
      this.isLoading = true;
      const payload = {
        accountNumber: this.accountNumber,
        principalAmount: this.fdForm.get('principalAmount')?.value,
        termMonths: this.fdForm.get('termMonths')?.value
      };
      console.log('FD Creation Payload:', payload);
      this.apiService.createFixedDeposit(payload).subscribe({
        next: (res: any) => {
          this.message = res.message || 'Fixed Deposit created!';
          this.isLoading = false;
          this.fdForm.reset({ termMonths: 6 });
          this.fetchFDs();
        },
        error: (err) => {
          console.error('FD Creation Error:', err);
          this.error = err.error?.message || 'Failed to create Fixed Deposit.';
          this.isLoading = false;
        }
      });
    }
  }
}
