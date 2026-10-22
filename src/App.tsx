
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { CodingModule } from '@/components/coding/CodingModule';
import { LibraryModule } from '@/components/library/LibraryModule';
import { TerminologyModule } from '@/components/terminology/TerminologyModule';
import { SettingsModule } from '@/components/settings/SettingsModule';
import { GuideModule } from '@/components/guide/GuideModule';
import { UserCenterModule } from '@/components/user-center/UserCenterModule';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { LoginPage } from '@/components/auth/LoginPage';
import { RegisterPage } from '@/components/auth/RegisterPage';
import { ForgotPasswordPage } from '@/components/auth/ForgotPasswordPage';

type AuthView = 'main' | 'login' | 'register' | 'forgot-password';

export default function App() {
  const store = useAppStore();
  const { checkAuth, isLoading: authLoading } = useAuthStore();
  const [authView, setAuthView] = useState<AuthView>('main');

  useEffect(() => {
    checkAuth();
  }, []);

  const handleClearAll = () => {
    store.setCodingResult(null as never);
    store.clearMemos();
    store.setSelectedTheory(null);
  };

  const handleLogin = () => setAuthView('login');
  const handleRegister = () => setAuthView('register');
  const handleForgotPassword = () => setAuthView('forgot-password');
  const handleAuthSuccess = () => setAuthView('main');

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // Auth views
  if (authView === 'login') {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-52 shrink-0 bg-gray-950" />
        <div className="flex-1 flex flex-col">
          <TopBar activeModule="coding" onRegister={handleRegister} />
          <main className="flex-1 overflow-y-auto px-6 py-5">
            <LoginPage
              onRegister={handleRegister}
              onForgotPassword={handleForgotPassword}
              onSuccess={handleAuthSuccess}
            />
          </main>
        </div>
      </div>
    );
  }

  if (authView === 'register') {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-52 shrink-0 bg-gray-950" />
        <div className="flex-1 flex flex-col">
          <TopBar activeModule="coding" onLogin={handleLogin} />
          <main className="flex-1 overflow-y-auto px-6 py-5">
            <RegisterPage onLogin={handleLogin} onSuccess={handleAuthSuccess} />
          </main>
        </div>
      </div>
    );
  }

  if (authView === 'forgot-password') {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-52 shrink-0 bg-gray-950" />
        <div className="flex-1 flex flex-col">
          <TopBar activeModule="coding" />
          <main className="flex-1 overflow-y-auto px-6 py-5">
            <ForgotPasswordPage onBackToLogin={handleLogin} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        active={store.activeModule}
        onNavigate={store.setActiveModule}
        onLogin={handleLogin}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          activeModule={store.activeModule}
          onClearAll={store.activeModule === 'coding' ? handleClearAll : undefined}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          {store.activeModule === 'coding' && (
            <CodingModule
              selectedTheory={store.selectedTheory}
              onSelectTheory={store.setSelectedTheory}
              codingDepth={store.codingDepth}
              onDepthChange={store.setCodingDepth}
              domain={store.domain}
              onDomainChange={store.setDomain}
              codingResult={store.codingResult}
              onCodingResult={store.setCodingResult}
              referenceDocs={store.referenceDocs}
              terminology={store.terminology}
              apiConfig={store.apiConfig}
              memos={store.memos}
              onAddMemo={store.addMemo}
              onGoSettings={() => store.setActiveModule('settings')}
            />
          )}

          {store.activeModule === 'library' && (
            <LibraryModule
              docs={store.referenceDocs}
              onDocsChange={store.setReferenceDocs}
              apiConfig={store.apiConfig}
            />
          )}

          {store.activeModule === 'terminology' && (
            <TerminologyModule
              config={store.terminology}
              onChange={store.setTerminology}
            />
          )}

          {store.activeModule === 'settings' && (
            <SettingsModule
              config={store.apiConfig}
              onSave={store.saveApiConfig}
            />
          )}

          {store.activeModule === 'guide' && <GuideModule />}

          {store.activeModule === 'user-center' && <UserCenterModule />}

          {store.activeModule === 'admin' && <AdminPanel />}
        </main>
      </div>
    </div>
  );
}
