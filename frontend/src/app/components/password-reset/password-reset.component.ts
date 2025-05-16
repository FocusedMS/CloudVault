import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { PasswordResetService } from '../../services/password-reset.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-password-reset',
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.css'],
  standalone: false
})
export class PasswordResetComponent implements OnInit {
  resetForm!: FormGroup;
  loading = false;
  error = '';
  success = '';
  isTokenValidation = false;
  generatedToken: string | null = null;
  showPassword = false;
  showConfirmPassword = false;
  passwordStrengthClass = '';
  passwordStrengthText = '';

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    // Check if we're in token validation mode
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.isTokenValidation = true;
        this.resetForm.patchValue({ token: params['token'] });
        this.validateToken(params['token']);
      }
    });

    // Monitor password changes for strength
    this.resetForm.get('newPassword')?.valueChanges.subscribe(value => {
      if (value) {
        this.checkPasswordStrength(value);
      }
    });
  }

  private initializeForm() {
    if (this.isTokenValidation) {
      this.resetForm = this.fb.group({
        token: ['', Validators.required],
        newPassword: ['', [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern('^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$')
        ]],
        confirmPassword: ['', Validators.required]
      }, { validator: this.passwordMatchValidator });
    } else {
      this.resetForm = this.fb.group({
        accountNumber: ['', [
          Validators.required,
          Validators.pattern('^BANK[A-Z0-9]{6}$')
        ]]
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetForm.get(fieldName);
    if (!field) return false;
    
    if (fieldName === 'confirmPassword') {
      return field.touched && (field.invalid || this.resetForm.hasError('mismatch'));
    }
    
    return field.invalid && field.touched;
  }

  async onSubmit() {
    if (this.resetForm.invalid) {
      // Mark all fields as touched to trigger validation display
      Object.keys(this.resetForm.controls).forEach(key => {
        const control = this.resetForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    try {
      if (!this.isTokenValidation) {
        // Initiate password reset
        const accountNumber = this.resetForm.get('accountNumber')?.value;
        console.log('Sending reset request with account number:', accountNumber);
        const response = await this.passwordResetService.initiateReset(accountNumber);
        this.generatedToken = response.token;
        this.toastr.success('Reset token generated successfully', '', {
          timeOut: 0,
          extendedTimeOut: 0,
          closeButton: true,
          positionClass: 'toast-top-center',
          enableHtml: true,
          toastClass: 'ngx-toastr custom-toast'
        });
      } else {
        // Reset password
        const token = this.resetForm.get('token')?.value;
        const newPassword = this.resetForm.get('newPassword')?.value;

        await this.passwordResetService.resetPassword(token, newPassword);
        this.toastr.success('Password reset successful!', '', {
          positionClass: 'toast-top-center'
        });
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      this.toastr.error(err.error?.message || 'An error occurred');
    } finally {
      this.loading = false;
    }
  }

  private async validateToken(token: string) {
    try {
      const isValid = await this.passwordResetService.validateToken(token);
      if (!isValid) {
        this.toastr.error('Invalid or expired reset token');
        this.router.navigate(['/login']);
      }
    } catch (err: any) {
      this.toastr.error(err.error?.message || 'Invalid or expired reset token');
      this.router.navigate(['/login']);
    }
  }

  copyToken(input: HTMLInputElement) {
    input.select();
    document.execCommand('copy');
    input.setSelectionRange(0, 0);
    this.toastr.success('Token copied to clipboard!', '', {
      positionClass: 'toast-top-center'
    });
  }

  proceedToReset() {
    if (this.generatedToken) {
      this.isTokenValidation = true;
      this.initializeForm(); // Reinitialize form with new validation rules
      this.resetForm.patchValue({ token: this.generatedToken });
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  private checkPasswordStrength(password: string) {
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
} 