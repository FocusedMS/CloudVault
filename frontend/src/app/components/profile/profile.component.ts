import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ]
})
export class ProfileComponent implements OnInit {
  accountDetails: any = null;
  isLoading = true;
  error = '';
  accountNumber = '';
  activeTab = 0;
  
  // Activity log simulation
  recentActivities = [
    { type: 'login', description: 'Logged in from Chrome browser', time: new Date(Date.now() - 1000 * 60 * 5), icon: 'login' },
    { type: 'transaction', description: 'Transferred ₹25,000 to BANK123456', time: new Date(Date.now() - 1000 * 60 * 60), icon: 'payment' },
    { type: 'profile', description: 'Updated phone number', time: new Date(Date.now() - 1000 * 60 * 60 * 2), icon: 'edit' },
    { type: 'security', description: 'Changed password', time: new Date(Date.now() - 1000 * 60 * 60 * 24), icon: 'security' }
  ];

  // Security preferences simulation
  securityPreferences = {
    twoFactorEnabled: true,
    loginNotifications: true,
    transactionAlerts: true,
    lastPasswordChange: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    deviceTrusted: ['Chrome - Windows', 'iPhone 13']
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    const user = this.authService.getUser();
    if (!user?.accountNumber) {
      this.error = 'No account number found. Please log in again.';
      this.isLoading = false;
      return;
    }

    this.accountNumber = user.accountNumber;
    this.apiService.getAccountDetails(this.accountNumber).subscribe({
      next: (data) => {
        this.accountDetails = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.error = err.error?.message || 'Failed to load profile. Please try again.';
        this.isLoading = false;
        this.showNotification(this.error);
      }
    });
  }

  getStatusColor(type: string): string {
    switch (type) {
      case 'login':
        return '#2196f3';
      case 'transaction':
        return '#43b96f';
      case 'profile':
        return '#ff9800';
      case 'security':
        return '#f44336';
      default:
        return '#757575';
    }
  }

  toggleTwoFactor(): void {
    this.securityPreferences.twoFactorEnabled = !this.securityPreferences.twoFactorEnabled;
    this.showNotification('Two-factor authentication ' + 
      (this.securityPreferences.twoFactorEnabled ? 'enabled' : 'disabled'));
  }

  toggleNotification(type: 'login' | 'transaction'): void {
    if (type === 'login') {
      this.securityPreferences.loginNotifications = !this.securityPreferences.loginNotifications;
    } else {
      this.securityPreferences.transactionAlerts = !this.securityPreferences.transactionAlerts;
    }
    this.showNotification(
      (type === 'login' ? 'Login notifications ' : 'Transaction alerts ') +
      (type === 'login' ? 
        (this.securityPreferences.loginNotifications ? 'enabled' : 'disabled') :
        (this.securityPreferences.transactionAlerts ? 'enabled' : 'disabled'))
    );
  }

  removeTrustedDevice(device: string): void {
    this.securityPreferences.deviceTrusted = 
      this.securityPreferences.deviceTrusted.filter(d => d !== device);
    this.showNotification(`${device} removed from trusted devices`);
  }

  private showNotification(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
