import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PasswordResetService } from '../../services/password-reset.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: false,
  styleUrls: ['./login.component.css'] 
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  resetForm: FormGroup;
  newPasswordForm: FormGroup;
  loading = false;
  resetLoading = false;
  newPasswordLoading = false;
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  showForgotPassword = false;
  showNewPasswordForm = false;
  passwordStrengthClass = '';
  passwordStrengthText = '';
  resetToken: string | null = null;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private passwordResetService: PasswordResetService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      accountNumber: ['', [Validators.required, Validators.pattern('^BANK[A-Z0-9]{6}$')]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.resetForm = this.fb.group({
      resetAccountNumber: ['', [Validators.required, Validators.pattern('^BANK[A-Z0-9]{6}$')]]
    });

    this.newPasswordForm = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern('^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$')
      ]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }

    // Check if there's a reset token in the URL
    const urlParams = new URLSearchParams(window.location.search);
    this.resetToken = urlParams.get('token');
    
    if (this.resetToken) {
      this.validateResetToken(this.resetToken);
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  toggleForgotPassword(): void {
    this.showForgotPassword = !this.showForgotPassword;
    if (!this.showForgotPassword) {
      this.resetForm.reset();
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  isResetFieldInvalid(fieldName: string): boolean {
    const field = this.resetForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  isNewPasswordFieldInvalid(fieldName: string): boolean {
    const field = this.newPasswordForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  checkPasswordStrength(password: string): void {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[!@#$%^&*]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;

    switch (strength) {
      case 0:
      case 1:
        this.passwordStrengthClass = 'weak';
        this.passwordStrengthText = 'Weak';
        break;
      case 2:
      case 3:
        this.passwordStrengthClass = 'medium';
        this.passwordStrengthText = 'Medium';
        break;
      case 4:
        this.passwordStrengthClass = 'strong';
        this.passwordStrengthText = 'Strong';
        break;
    }
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.valid && !this.loading) {
      this.loading = true;
      this.authService.login(
        this.loginForm.value.accountNumber,
        this.loginForm.value.password
      ).subscribe({
        next: (result) => {
            this.router.navigate(['/home']);
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Login failed');
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        }
      });
    } else {
      // Show specific validation errors
      const accountControl = this.loginForm.get('accountNumber');
      if (accountControl?.errors) {
        if (accountControl.errors['required']) {
          this.toastr.error('Account number is required');
        } else if (accountControl.errors['pattern']) {
          this.toastr.error('Account number should be in format BANK followed by 6 characters (letters or numbers)');
        }
      }
      const passwordControl = this.loginForm.get('password');
      if (passwordControl?.errors?.['required']) {
        this.toastr.error('Password is required');
      }
    }
  }

  async onResetSubmit(): Promise<void> {
    if (this.resetForm.valid && !this.resetLoading) {
      this.resetLoading = true;
      try {
        await this.passwordResetService.initiateReset(this.resetForm.value.resetAccountNumber);
        this.toastr.success('Password reset initiated. Please check your account for the reset token.');
        this.toggleForgotPassword();
      } catch (error: any) {
        this.toastr.error(error.message || 'Failed to initiate password reset');
      } finally {
        this.resetLoading = false;
      }
    }
  }

  private async validateResetToken(token: string): Promise<void> {
    try {
      const isValid = await this.passwordResetService.validateToken(token);
      if (isValid) {
        this.showNewPasswordForm = true;
      } else {
        this.toastr.error('Invalid or expired reset token');
      }
    } catch (error: any) {
      this.toastr.error(error.message || 'Failed to validate reset token');
    }
  }

  async onNewPasswordSubmit(): Promise<void> {
    if (this.newPasswordForm.valid && !this.newPasswordLoading && this.resetToken) {
      this.newPasswordLoading = true;
      try {
        await this.passwordResetService.resetPassword(
          this.resetToken,
          this.newPasswordForm.value.newPassword
        );
        this.toastr.success('Password successfully reset. Please login with your new password.');
        this.showNewPasswordForm = false;
        this.resetToken = null;
        // Clear the token from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error: any) {
        this.toastr.error(error.message || 'Failed to reset password');
      } finally {
        this.newPasswordLoading = false;
      }
    }
  }
}