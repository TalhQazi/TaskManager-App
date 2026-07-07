import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Shield, Mail, Lock, Eye, EyeOff, Sparkles, Fingerprint, ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, isLoggingIn, loginError ,user} = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string>('');
  //const [loginAs, setLoginAs] = useState<'employee' | 'manager'>('manager');

  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const backgroundBounce = useRef(new Animated.Value(0)).current;
  //const roleChipScale = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const emailShake = useRef(new Animated.Value(0)).current;
  const passwordShake = useRef(new Animated.Value(0)).current;
  const floatingAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(backgroundBounce, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(formTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // Floating animation for background elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Role chip animation when changed
  /*useEffect(() => {
    Animated.sequence([
      Animated.timing(roleChipScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(roleChipScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loginAs]);*/

  const shakeAnimation = (animation: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animation, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(animation, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(animation, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(animation, { toValue: -3, duration: 50, useNativeDriver: true }),
      Animated.timing(animation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    setLocalError('');
    
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (!email.trim()) {
      setLocalError('Please enter your email');
      shakeAnimation(emailShake);
      return;
    }
    if (!password.trim()) {
      setLocalError('Please enter your password');
      shakeAnimation(passwordShake);
      return;
    }
    
    try {
    //  await login({ email: email.trim(), password, loginAs });
    await login({email: email.trim(), password,});
    } catch {
      console.log('[Login] Login failed');
    }
  };

  

  const errorMessage = localError || loginError;

  // Floating background circles
  const circle1TranslateX = floatingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });
  const circle1TranslateY = floatingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });
  const circle2TranslateX = floatingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });
  const circle2TranslateY = floatingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Animated Background Elements */}
        <Animated.View 
          style={[
            styles.backgroundCircle1,
            {
              transform: [
                { translateX: circle1TranslateX },
                { translateY: circle1TranslateY },
                { scale: backgroundBounce },
              ],
            },
          ]}
        />
        <Animated.View 
          style={[
            styles.backgroundCircle2,
            {
              transform: [
                { translateX: circle2TranslateX },
                { translateY: circle2TranslateY },
                { scale: backgroundBounce },
              ],
            },
          ]}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <Animated.View 
              style={[
                styles.logoContainer, 
                { 
                  transform: [{ scale: logoScale }],
                  opacity: logoOpacity,
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                style={styles.logoCircle}
              >
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </LinearGradient>
            </Animated.View>
            <Animated.Text style={[styles.appName, { opacity: logoOpacity }]}>
              TaskManager
            </Animated.Text>
            <Animated.Text style={[styles.subtitle, { opacity: logoOpacity }]}>
              {/*loginAs === 'manager' ? 'Manager Portal' : 'Employee Portal'*/}
              Login
            </Animated.Text>
            
          </View>

          <Animated.View
            style={[
              styles.formSection,
              { 
                opacity: formOpacity, 
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              style={styles.formGradient}
            >
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.instructionText}>Sign in to access your workspace</Text>

              {/* Role Switch  */}
              {/*<Animated.View style={[styles.roleSwitchRow, { transform: [{ scale: roleChipScale }] }]}>
                <TouchableOpacity
                  style={[styles.roleChip, loginAs === 'manager' && styles.roleChipActive]}
                  onPress={() => setLoginAs('manager')}
                  activeOpacity={0.7}
                  testID="login-as-manager"
                >
                  <Text style={[styles.roleChipText, loginAs === 'manager' && styles.roleChipTextActive]}>
                    Manager
                  </Text>
                  {loginAs === 'manager' && (
                    <Animated.View style={styles.roleChipActiveIndicator} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleChip, loginAs === 'employee' && styles.roleChipActive]}
                  onPress={() => setLoginAs('employee')}
                  activeOpacity={0.7}
                  testID="login-as-employee"
                >
                  <Text style={[styles.roleChipText, loginAs === 'employee' && styles.roleChipTextActive]}>
                    Employee
                  </Text>
                  {loginAs === 'employee' && (
                    <Animated.View style={styles.roleChipActiveIndicator} />
                  )}
                </TouchableOpacity>
                
              </Animated.View>*/}

              {/* Error Message with Animation */}
              {errorMessage ? (
                <Animated.View 
                  style={[
                    styles.errorContainer,
                    {
                      transform: [{
                        translateX: emailShake.interpolate({
                          inputRange: [-10, 10],
                          outputRange: [-5, 5],
                        }),
                      }],
                    },
                  ]}
                >
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </Animated.View>
              ) : null}

              {/* Input Fields */}
              <View style={styles.inputGroup}>
                <Animated.View style={[styles.inputContainer, { transform: [{ translateX: emailShake }] }]}>
                  <Mail color={Colors.textTertiary} size={18} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={Colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="login-email"
                  />
                </Animated.View>

                <Animated.View style={[styles.inputContainer, { transform: [{ translateX: passwordShake }] }]}>
                  <Lock color={Colors.textTertiary} size={18} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={Colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    testID="login-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff color={Colors.textTertiary} size={18} />
                    ) : (
                      <Eye color={Colors.textTertiary} size={18} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoggingIn}
                  activeOpacity={0.8}
                  testID="login-submit"
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonGradient}
                  >
                    {isLoggingIn ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>Sign In</Text>
                        <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

             
            </LinearGradient>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: formOpacity }]}>
            <Text style={styles.footerText}> 2024 TaskManager. All rights reserved.</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  backgroundCircle1: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -width * 0.2,
    right: -width * 0.2,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    bottom: -width * 0.1,
    left: -width * 0.1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
    fontWeight: '500',
  },
  formSection: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 12,
  },
  formGradient: {
    padding: 28,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  roleSwitchRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: 20,
    gap: 8,
  },
  roleChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
  },
  roleChipActiveIndicator: {
    position: 'absolute',
    bottom: -1,
    width: 30,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: Colors.errorLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    gap: 14,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 12,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  biometricIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 102, 169, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
  },
});