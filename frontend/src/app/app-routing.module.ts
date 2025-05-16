import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WelcomeComponent } from './components/welcome/welcome.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { LoadingComponent } from './components/loading/loading.component';
import { TestConnectionComponent } from './components/test-connection/test-connection.component';
import { TransactionComponent } from './components/transaction/transaction.component';
import { FixedDepositComponent } from './components/fixed-deposit/fixed-deposit.component';
import { StatementComponent } from './components/statement/statement.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PasswordResetComponent } from './components/password-reset/password-reset.component';
import { SupportComponent } from './components/support/support.component';
import { AuthGuard } from './services/auth.guard';

const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'log', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reg', component: RegisterComponent },
  { path: 'reset-password', component: PasswordResetComponent },
  { path: 'reset-password/confirm', component: PasswordResetComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'transaction', component: TransactionComponent, canActivate: [AuthGuard] },
  { path: 'fixed-deposit', component: FixedDepositComponent, canActivate: [AuthGuard] },
  { path: 'statement', component: StatementComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'support', component: SupportComponent, canActivate: [AuthGuard] },
  { path: 'loading', component: LoadingComponent, canActivate: [AuthGuard] },
  { path: 'test-connection', component: TestConnectionComponent, canActivate: [AuthGuard] }
  // { path: 'forgot', component: ForgotPasswordComponent } 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
