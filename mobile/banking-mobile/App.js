import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_BASE_URL = 'https://your-watermelon-banking-host.example.com';

function makeCaptchaPair() {
  return {
    left: Math.floor(Math.random() * 9) + 1,
    right: Math.floor(Math.random() * 9) + 1,
  };
}

function formatCurrencyFromCents(amountInCents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((amountInCents ?? 0) / 100);
}

function isDemoBeneficiary(username) {
  return String(username ?? '').startsWith('demo-beneficiary-');
}

function apiHeaders(sessionToken, json = true) {
  const headers = {};
  if (json) {
    headers['Content-Type'] = 'application/json';
  }
  if (sessionToken) {
    headers['x-banking-session'] = sessionToken;
  }
  return headers;
}

function BankingInput({ label, value, onChangeText, ...rest }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#7d887f"
        {...rest}
      />
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function TransactionCard({ row }) {
  return (
    <View style={styles.transactionCard}>
      <Text style={styles.transactionId}>{row.transactionId}</Text>
      <Text style={styles.transactionMeta}>
        {new Date(row.createdAt).toLocaleString()} • {row.transactionType} • {row.direction}
      </Text>
      <Text style={styles.transactionDescription}>{row.description}</Text>
      <Text style={styles.transactionMeta}>Counterparty: {row.counterparty}</Text>
      <Text style={styles.transactionAmount}>{row.amountDisplay}</Text>
      <Text style={styles.transactionMeta}>Balance after: {row.balanceAfterDisplay}</Text>
    </View>
  );
}

function DestinationPicker({ destinations, value, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Transfer To Username</Text>
      <View style={styles.destinationList}>
        {destinations.map((destination) => {
          const selected = destination.username === value;
          const disabled = isDemoBeneficiary(destination.username);

          return (
            <Pressable
              key={destination.username}
              style={[
                styles.destinationChip,
                selected && styles.destinationChipSelected,
                disabled && styles.destinationChipDisabled,
              ]}
              onPress={() => onChange(destination.username)}
            >
              <Text
                style={[
                  styles.destinationTitle,
                  selected && styles.destinationTitleSelected,
                  disabled && styles.destinationTitleDisabled,
                ]}
              >
                {destination.displayName}
              </Text>
              <Text
                style={[
                  styles.destinationMeta,
                  selected && styles.destinationMetaSelected,
                  disabled && styles.destinationMetaDisabled,
                ]}
              >
                {destination.username} • {destination.accountNumber}
              </Text>
              {disabled ? (
                <Text style={styles.destinationHint}>Demo beneficiary, not enabled for transfers</Text>
              ) : (
                <Text style={styles.destinationHint}>Enabled transfer destination</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [sessionToken, setSessionToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [statementMessage, setStatementMessage] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [captcha, setCaptcha] = useState(makeCaptchaPair());
  const [loginForm, setLoginForm] = useState({
    username: 'bankinguser1',
    password: 'password',
    captchaAnswer: '',
  });
  const [transferForm, setTransferForm] = useState({
    destinationUsername: '',
    amount: '',
    recipientEmail: '',
    otp: '',
  });
  const [statementForm, setStatementForm] = useState({
    transactionCount: '5',
    email: '',
  });
  const [statementRows, setStatementRows] = useState([]);

  const defaultRecipient = useMemo(() => {
    return dashboard?.user?.email ?? '';
  }, [dashboard]);

  function resetCaptcha() {
    setCaptcha(makeCaptchaPair());
    setLoginForm((current) => ({ ...current, captchaAnswer: '' }));
  }

  function hydrateDashboard(nextDashboard) {
    const firstRealDestination =
      nextDashboard.transferDestinations?.find(
        (destination) => !isDemoBeneficiary(destination.username)
      )?.username ||
      nextDashboard.transferDestinations?.[0]?.username ||
      '';

    setDashboard(nextDashboard);
    setStatementRows(nextDashboard.recentTransactions ?? []);
    setTransferForm((current) => ({
      ...current,
      destinationUsername:
        current.destinationUsername && !isDemoBeneficiary(current.destinationUsername)
          ? current.destinationUsername
          : firstRealDestination,
      recipientEmail: current.recipientEmail || nextDashboard.user?.email || '',
      otp: '',
      amount: '',
    }));
    setStatementForm((current) => ({
      ...current,
      email: current.email || nextDashboard.user?.email || '',
    }));
  }

  async function handleLogin() {
    setLoading(true);
    setLoginError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/banking/login`, {
        method: 'POST',
        headers: apiHeaders('', true),
        body: JSON.stringify({
          username: loginForm.username.trim(),
          password: loginForm.password,
          captchaAnswer: Number(loginForm.captchaAnswer),
          captchaLeft: captcha.left,
          captchaRight: captcha.right,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setLoginError(payload.error ?? 'Unable to sign in.');
        resetCaptcha();
        return;
      }

      const nextSessionToken = payload.sessionToken;

      if (!nextSessionToken) {
        setLoginError('Login succeeded, but the banking session token was not returned.');
        return;
      }

      setSessionToken(nextSessionToken);

      const dashboardResponse = await fetch(`${API_BASE_URL}/api/banking/dashboard`, {
        headers: apiHeaders(nextSessionToken, false),
      });

      const dashboardPayload = await dashboardResponse.json();

      if (!dashboardResponse.ok) {
        setLoginError(dashboardPayload.error ?? 'Signed in, but could not load the banking dashboard.');
        return;
      }

      hydrateDashboard(dashboardPayload.dashboard);

      setScreen('dashboard');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unknown error.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/banking/logout`, {
        method: 'POST',
        headers: apiHeaders(sessionToken, false),
      });
    } catch (error) {
      // best-effort logout
    } finally {
      setSessionToken('');
      setDashboard(null);
      setStatementRows([]);
      setTransferMessage('');
      setStatementMessage('');
      setScreen('login');
      resetCaptcha();
      setLoading(false);
    }
  }

  async function sendOtp() {
    setTransferMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/banking/transfer/send-otp`, {
        method: 'POST',
        headers: apiHeaders(sessionToken, true),
        body: JSON.stringify(transferForm),
      });

      const payload = await response.json();

      if (!response.ok) {
        Alert.alert('Could not send OTP', payload.error ?? 'Unknown error');
        return;
      }

      setTransferMessage(payload.message ?? 'OTP sent.');
    } catch (error) {
      Alert.alert('Network error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function submitTransfer() {
    setTransferMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/banking/transfer`, {
        method: 'POST',
        headers: apiHeaders(sessionToken, true),
        body: JSON.stringify(transferForm),
      });

      const payload = await response.json();

      if (!response.ok) {
        Alert.alert('Transfer failed', payload.error ?? 'Unknown error');
        return;
      }

      hydrateDashboard(payload.dashboard);
      setTransferForm((current) => ({
        ...current,
        amount: '',
        otp: '',
        recipientEmail: current.recipientEmail || defaultRecipient,
      }));
      setTransferMessage(`Transfer successful. Transaction ID: ${payload.transactionId}`);
    } catch (error) {
      Alert.alert('Network error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function generateStatement() {
    setStatementMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/banking/statement`, {
        method: 'POST',
        headers: apiHeaders(sessionToken, true),
        body: JSON.stringify(statementForm),
      });

      const payload = await response.json();

      if (!response.ok) {
        Alert.alert('Statement failed', payload.error ?? 'Unknown error');
        return;
      }

      setStatementRows(payload.rows ?? []);
      setStatementMessage(
        payload.emailed
          ? 'Statement generated and emailed successfully.'
          : 'Statement generated successfully. Email was not sent.'
      );
    } catch (error) {
      Alert.alert('Network error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Watermelon Banking</Text>
        <Text style={styles.title}>Customer Banking</Text>
        <Text style={styles.subtitle}>
          Native Android banking experience for login, balance review, OTP-authorized transfers,
          statement generation, and logout.
        </Text>

        {screen === 'login' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sign in</Text>
            <Text style={styles.helperText}>
              Demo credentials: bankinguser1 / password or bankinguser2 / password
            </Text>

            <BankingInput
              label="Username"
              value={loginForm.username}
              onChangeText={(value) => setLoginForm((current) => ({ ...current, username: value }))}
              autoCapitalize="none"
              placeholder="bankinguser1"
            />

            <BankingInput
              label="Password"
              value={loginForm.password}
              onChangeText={(value) => setLoginForm((current) => ({ ...current, password: value }))}
              secureTextEntry
              placeholder="password"
            />

            <View style={styles.field}>
              <Text style={styles.label}>Captcha</Text>
              <View style={styles.captchaRow}>
                <View style={styles.captchaBox}>
                  <Text style={styles.captchaValue}>{captcha.left}</Text>
                </View>
                <Text style={styles.captchaSymbol}>+</Text>
                <View style={styles.captchaBox}>
                  <Text style={styles.captchaValue}>{captcha.right}</Text>
                </View>
                <Text style={styles.captchaSymbol}>=</Text>
                <TextInput
                  style={[styles.input, styles.captchaInput]}
                  value={loginForm.captchaAnswer}
                  onChangeText={(value) =>
                    setLoginForm((current) => ({
                      ...current,
                      captchaAnswer: value.replace(/\D/g, '').slice(0, 2),
                    }))
                  }
                  keyboardType="number-pad"
                  placeholder="?"
                  placeholderTextColor="#7d887f"
                />
              </View>
              <Pressable style={styles.secondaryButton} onPress={resetCaptcha}>
                <Text style={styles.secondaryButtonText}>Refresh Captcha</Text>
              </Pressable>
            </View>

            {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

            <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
            </Pressable>
          </View>
        ) : null}

        {screen === 'dashboard' && dashboard ? (
          <>
            <View style={styles.card}>
              <View style={styles.topRow}>
                <View>
                  <Text style={styles.sectionTitle}>Welcome back</Text>
                  <Text style={styles.helperText}>{dashboard.user.displayName}</Text>
                </View>
                <Pressable style={styles.secondaryButtonCompact} onPress={handleLogout}>
                  <Text style={styles.secondaryButtonText}>Logout</Text>
                </Pressable>
              </View>

              <DetailRow label="Username" value={dashboard.user.username} />
              <DetailRow label="Email" value={dashboard.user.email} />
              <DetailRow label="Account Number" value={dashboard.user.accountNumber} />
              <DetailRow label="Available Balance" value={dashboard.user.balanceDisplay} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Transfer Money</Text>
            <Text style={styles.helperText}>
              Send OTP first, then complete the transfer with the OTP received by email.
            </Text>

            <DestinationPicker
              destinations={dashboard.transferDestinations}
              value={transferForm.destinationUsername}
              onChange={(value) =>
                setTransferForm((current) => ({ ...current, destinationUsername: value }))
              }
            />

            <BankingInput
              label="Amount (USD)"
                value={transferForm.amount}
                onChangeText={(value) =>
                  setTransferForm((current) => ({
                    ...current,
                    amount: value.replace(/[^0-9.]/g, ''),
                  }))
                }
                keyboardType="decimal-pad"
                placeholder="500.00"
              />

              <BankingInput
                label="OTP Email Address"
                value={transferForm.recipientEmail}
                onChangeText={(value) =>
                  setTransferForm((current) => ({ ...current, recipientEmail: value }))
                }
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={defaultRecipient || 'recipient@example.com'}
              />

              <BankingInput
                label="OTP"
                value={transferForm.otp}
                onChangeText={(value) =>
                  setTransferForm((current) => ({
                    ...current,
                    otp: value.replace(/\D/g, '').slice(0, 6),
                  }))
                }
                keyboardType="number-pad"
                placeholder="Enter 6 digit OTP"
              />

              {transferMessage ? <Text style={styles.successText}>{transferMessage}</Text> : null}

              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryButtonWide} onPress={sendOtp} disabled={loading}>
                  <Text style={styles.secondaryButtonText}>Send OTP</Text>
                </Pressable>
                <Pressable style={styles.primaryButtonWide} onPress={submitTransfer} disabled={loading}>
                  <Text style={styles.primaryButtonText}>Transfer</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Statements</Text>
              <Text style={styles.helperText}>
                Generate the latest transactions and optionally email the statement.
              </Text>

              <BankingInput
                label="Transactions to include"
                value={statementForm.transactionCount}
                onChangeText={(value) =>
                  setStatementForm((current) => ({
                    ...current,
                    transactionCount: value.replace(/\D/g, '').slice(0, 2),
                  }))
                }
                keyboardType="number-pad"
                placeholder="5"
              />

              <BankingInput
                label="Email statement to"
                value={statementForm.email}
                onChangeText={(value) =>
                  setStatementForm((current) => ({ ...current, email: value }))
                }
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={defaultRecipient || 'recipient@example.com'}
              />

              {statementMessage ? <Text style={styles.successText}>{statementMessage}</Text> : null}

              <Pressable style={styles.primaryButton} onPress={generateStatement} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Generate Statement</Text>}
              </Pressable>

              <Text style={styles.sectionSubtitle}>Recent Transactions</Text>
              {statementRows.length === 0 ? (
                <Text style={styles.helperText}>No transaction rows available yet.</Text>
              ) : (
                statementRows.map((row) => <TransactionCard key={row.transactionId} row={row} />)
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#1e5f8c',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#12314e',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5d7289',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#12314e',
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#12314e',
    marginTop: 6,
  },
  helperText: {
    color: '#5d7289',
    lineHeight: 22,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#37516b',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6e1ec',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fbfdff',
    color: '#12314e',
  },
  primaryButton: {
    backgroundColor: '#0f6ea7',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonWide: {
    flex: 1,
    backgroundColor: '#0f6ea7',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d6e1ec',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonCompact: {
    borderWidth: 1,
    borderColor: '#d6e1ec',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
  },
  secondaryButtonWide: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d6e1ec',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#12314e',
    fontSize: 16,
    fontWeight: '700',
  },
  captchaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  captchaBox: {
    minWidth: 54,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d6e1ec',
    backgroundColor: '#fbfdff',
    alignItems: 'center',
  },
  captchaValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#12314e',
  },
  captchaSymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5d7289',
  },
  captchaInput: {
    flex: 1,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  detailLabel: {
    color: '#5d7289',
    marginBottom: 4,
  },
  detailValue: {
    color: '#12314e',
    fontWeight: '700',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  destinationList: {
    gap: 10,
  },
  destinationChip: {
    borderWidth: 1,
    borderColor: '#d6e1ec',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#fbfdff',
    gap: 4,
  },
  destinationChipSelected: {
    borderColor: '#0f6ea7',
    backgroundColor: '#eef7ff',
  },
  destinationChipDisabled: {
    opacity: 0.72,
  },
  destinationTitle: {
    color: '#12314e',
    fontWeight: '800',
  },
  destinationTitleSelected: {
    color: '#0f6ea7',
  },
  destinationTitleDisabled: {
    color: '#5d7289',
  },
  destinationMeta: {
    color: '#617790',
  },
  destinationMetaSelected: {
    color: '#0f6ea7',
  },
  destinationMetaDisabled: {
    color: '#7d8da0',
  },
  destinationHint: {
    color: '#7d8da0',
    fontSize: 12,
  },
  errorText: {
    color: '#c0392b',
    fontWeight: '600',
  },
  successText: {
    color: '#12724f',
    fontWeight: '600',
  },
  transactionCard: {
    borderWidth: 1,
    borderColor: '#e2eaf2',
    borderRadius: 18,
    padding: 14,
    gap: 4,
    backgroundColor: '#fbfdff',
  },
  transactionId: {
    color: '#12314e',
    fontWeight: '800',
  },
  transactionMeta: {
    color: '#617790',
  },
  transactionDescription: {
    color: '#12314e',
    fontWeight: '600',
  },
  transactionAmount: {
    color: '#0f6ea7',
    fontWeight: '800',
    fontSize: 16,
  },
});
