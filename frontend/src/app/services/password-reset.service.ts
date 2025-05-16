import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface ResetResponse {
  token: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  async initiateReset(accountNumber: string): Promise<ResetResponse> {
    console.log('Initiating password reset with payload:', { accountNumber });
    try {
      const response = await firstValueFrom(
        this.http.post<ResetResponse>(`${this.apiUrl}/reset-password/initiate`, { accountNumber })
      );
      console.log('Password reset response:', response);
      return response;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    return firstValueFrom(
      this.http.post<boolean>(`${this.apiUrl}/reset-password/validate`, { token })
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.apiUrl}/reset-password/reset`, { token, newPassword })
    );
  }
} 