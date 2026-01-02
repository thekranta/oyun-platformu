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

// Web-only Turnstile Container - Platform.select ile conditional export
const TurnstileContainer = Platform.select({
    web: () => {
        // Web'de çalışacak bileşen
        const WebTurnstile = ({ siteKey, onVerify, onError, onExpire, theme, size }: TurnstileProps) => {
            const containerRef = useRef<HTMLDivElement | null>(null);
            const widgetIdRef = useRef<string | null>(null);
            const [isLoaded, setIsLoaded] = useState(false);

            useEffect(() => {
                const loadTurnstileScript = () => {
                    return new Promise<void>((resolve, reject) => {
                        if ((window as any).turnstile) {
                            resolve();
                            return;
                        }

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

                        if (containerRef.current && (window as any).turnstile) {
                            if (widgetIdRef.current) {
                                try {
                                    (window as any).turnstile.remove(widgetIdRef.current);
                                } catch (e) { }
                            }

                            widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
                                sitekey: siteKey,
                                theme: theme || 'light',
                                size: size || 'normal',
                                callback: (token: string) => {
                                    console.log('Turnstile verified');
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

                return () => {
                    if (widgetIdRef.current && (window as any).turnstile) {
                        try {
                            (window as any).turnstile.remove(widgetIdRef.current);
                        } catch (e) { }
                    }
                };
            }, [siteKey, theme, size, onVerify, onError, onExpire]);

            return (
                <View style={styles.container}>
                    {!isLoaded && (
                        <Text style={styles.loadingText}>Güvenlik yükleniyor...</Text>
                    )}
                    <View
                        ref={containerRef as any}
                        style={{ minHeight: 65, minWidth: 300 }}
                    />
                </View>
            );
        };
        return WebTurnstile;
    },
    default: () => {
        // Mobil platformlarda boş bileşen
        const NullComponent = () => null;
        return NullComponent;
    },
})();

// Ana export - platform'a göre doğru bileşeni döndürür
export default function CloudflareTurnstile(props: TurnstileProps) {
    if (Platform.OS !== 'web') {
        return null;
    }

    // TurnstileContainer'ı çağır
    return <TurnstileContainer {...props} />;
}

// Widget'ı resetlemek için
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
