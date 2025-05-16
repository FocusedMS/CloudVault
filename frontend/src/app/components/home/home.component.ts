import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface AccountDetails {
  accountNumber: string;
  accountHolderName: string;
  balance: number;
  accountType: string;
  accountCreationDate: string;
  phoneNumber: string;
  permanentAddress: string;
  governmentIssuedID: string;
  idNumber: string;
}

interface Transaction {
  transactionId: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  description: string;
  timestamp: string;
  type: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  showBalance = false;
  accountDetails: AccountDetails | null = null;
  balance: number | null = null;
  accountNumber: string = '';
  transactions: Transaction[] = [];
  loading: boolean = true;
  error: string | null = null;
  displayedBalance: number = 0;
  animationFrame: number | null = null;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAccountDetails();
  }

  private loadAccountDetails(): void {
    const currentUser = this.authService.getUser();
    if (!currentUser?.accountNumber) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.apiService.getAccountDetails(currentUser.accountNumber).subscribe({
      next: (details: AccountDetails) => {
        this.accountDetails = details;
        this.loading = false;
        this.balance = details.balance;
        this.accountNumber = details.accountNumber;
        if (typeof details.balance === 'number') {
          this.animateBalance(details.balance);
        }
        this.loadRecentTransactions(currentUser.accountNumber);
      },
      error: (error) => {
        this.error = 'Failed to load account details';
        this.loading = false;
        console.error('Error loading account details:', error);
      }
    });
  }

  private loadRecentTransactions(accountNumber: string): void {
    this.apiService.getTransactionHistory(accountNumber).subscribe({
      next: (transactions: Transaction[]) => {
        this.transactions = transactions;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
      }
    });
  }

  toggleBalance() {
    this.showBalance = !this.showBalance;
  }

  logout() {
    const confirmed = confirm('Do you want to exit?');
    if (confirmed) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  private animateBalance(target: number) {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const startValue = 0;
    const duration = 1000; // 1 second
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      this.displayedBalance = startValue + (target - startValue) * easeOutQuart;

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.displayedBalance = target;
        this.animationFrame = null;
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  ngOnDestroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}