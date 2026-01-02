import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface TurnstileProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact';
}

// Sadece Web platformunda çalışır
function CloudflareTurnstile({
    siteKey,
    onVerify,
    onError,
    onExpire,
    theme = 'light',
    size = 'normal'
}: TurnstileProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerId = useRef(`turnstile-${Math.random().toString(36).substr(2, 9)}`);
    const widgetId = useRef<string | null>(null);

    // Script yükleme
    const loadScript = useCallback((): Promise<void> => {
        return new Promise((resolve, reject) => {
            // Zaten yüklüyse
            if (typeof window !== 'undefined' && (window as any).turnstile) {
                resolve();
                return;
            }

            // Script zaten DOM'da mı?
            if (typeof document !== 'undefined') {
                const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
                if (existing) {
                    existing.addEventListener('load', () => resolve());
                    if ((window as any).turnstile) resolve();
                    return;
                }

                // Script ekle
                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    console.log('Turnstile script loaded');
                    resolve();
                };
                script.onerror = () => reject(new Error('Script load failed'));
                document.head.appendChild(script);
            } else {
                reject(new Error('Document not available'));
            }
        });
    }, []);

    // Widget render
    const renderWidget = useCallback(() => {
        if (typeof window === 'undefined' || !(window as any).turnstile) return;

        const container = document.getElementById(containerId.current);
        if (!container) {
            console.error('Turnstile container not found');
            return;
        }

        // Önceki widget'ı temizle
        if (widgetId.current) {
            try {
                (window as any).turnstile.remove(widgetId.current);
            } catch (e) { }
        }

        try {
            widgetId.current = (window as any).turnstile.render(`#${containerId.current}`, {
                sitekey: siteKey,
                theme: theme,
                size: size,
                callback: (token: string) => {
                    console.log('Turnstile verified successfully');
                    onVerify(token);
                },
                'error-callback': () => {
                    console.error('Turnstile error callback');
                    setError('Doğrulama hatası');
                    onError?.();
                },
                'expired-callback': () => {
                    console.log('Turnstile token expired');
                    onExpire?.();
                },
            });
            setIsLoaded(true);
        } catch (e) {
            console.error('Turnstile render error:', e);
            setError('Widget yüklenemedi');
        }
    }, [siteKey, theme, size, onVerify, onError, onExpire]);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        let mounted = true;

        const init = async () => {
            try {
                await loadScript();

                // Script yüklendikten sonra DOM hazır olana kadar bekle
                const checkAndRender = () => {
                    if (!mounted) return;

                    const container = document.getElementById(containerId.current);
                    if (container && (window as any).turnstile) {
                        renderWidget();
                    } else {
                        // Container henüz hazır değilse tekrar dene
                        setTimeout(checkAndRender, 100);
                    }
                };

                // Biraz bekle, sonra render et
                setTimeout(checkAndRender, 200);
            } catch (e) {
                if (mounted) {
                    console.error('Turnstile init error:', e);
                    setError('Güvenlik yüklenemedi');
                }
            }
        };

        init();

        return () => {
            mounted = false;
            if (widgetId.current && (window as any).turnstile) {
                try {
                    (window as any).turnstile.remove(widgetId.current);
                } catch (e) { }
            }
        };
    }, [loadScript, renderWidget]);

    // Mobil'de görünmez
    if (Platform.OS !== 'web') {
        return null;
    }

    // Web'de native div render et
    return (
        <View style={styles.container}>
            {!isLoaded && !error && (
                <Text style={styles.loadingText}>Güvenlik yükleniyor...</Text>
            )}
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}
            {/* Native HTML div - React Native Web bu şekilde destekler */}
            <div
                id={containerId.current}
                style={{
                    minHeight: 65,
                    minWidth: 300,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            />
        </View>
    );
}

export default CloudflareTurnstile;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 15,
        minHeight: 70,
    },
    loadingText: {
        fontSize: 12,
        color: '#9E9E9E',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#f44336',
        marginBottom: 8,
    },
});
