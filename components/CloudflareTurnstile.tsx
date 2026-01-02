import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface TurnstileProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact';
}

// Bu bileşen sadece Web platformunda çalışır
export default function CloudflareTurnstile({
    siteKey,
    onVerify,
    onError,
    onExpire,
    theme = 'light',
    size = 'normal'
}: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // Turnstile script'ini yükle
        const loadTurnstileScript = () => {
            return new Promise<void>((resolve, reject) => {
                // Script zaten yüklüyse
                if ((window as any).turnstile) {
                    resolve();
                    return;
                }

                // Zaten eklenmişse bekle
                const existingScript = document.querySelector('script[src*="turnstile"]');
                if (existingScript) {
                    existingScript.addEventListener('load', () => resolve());
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                script.defer = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Turnstile script yüklenemedi'));
                document.head.appendChild(script);
            });
        };

        const initWidget = async () => {
            try {
                await loadTurnstileScript();
                setIsLoaded(true);

                // Widget'ı render et
                if (containerRef.current && (window as any).turnstile) {
                    // Önceki widget varsa kaldır
                    if (widgetIdRef.current) {
                        try {
                            (window as any).turnstile.remove(widgetIdRef.current);
                        } catch (e) { }
                    }

                    widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
                        sitekey: siteKey,
                        theme: theme,
                        size: size,
                        callback: (token: string) => {
                            console.log('Turnstile verified:', token.substring(0, 20) + '...');
                            onVerify(token);
                        },
                        'error-callback': () => {
                            console.log('Turnstile error');
                            onError?.();
                        },
                        'expired-callback': () => {
                            console.log('Turnstile expired');
                            onExpire?.();
                        },
                    });
                }
            } catch (error) {
                console.error('Turnstile init error:', error);
            }
        };

        initWidget();

        // Cleanup
        return () => {
            if (widgetIdRef.current && (window as any).turnstile) {
                try {
                    (window as any).turnstile.remove(widgetIdRef.current);
                } catch (e) { }
            }
        };
    }, [siteKey, theme, size]);

    // Mobil platformlarda görünmez
    if (Platform.OS !== 'web') {
        return null;
    }

    return (
        <View style={styles.container}>
            {!isLoaded && (
                <Text style={styles.loadingText}>Güvenlik yükleniyor...</Text>
            )}
            <div
                ref={(el) => { containerRef.current = el; }}
                style={{ minHeight: 65 }}
            />
        </View>
    );
}

// Widget'ı resetlemek için dışarıdan çağrılabilir
export const resetTurnstile = () => {
    if (Platform.OS === 'web' && (window as any).turnstile) {
        try {
            (window as any).turnstile.reset();
        } catch (e) { }
    }
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 15,
        minHeight: 65,
    },
    loadingText: {
        fontSize: 12,
        color: '#9E9E9E',
        position: 'absolute',
    },
});
