import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    children: React.ReactNode;
    onExit: () => void;
    gameName?: string;
}

interface State {
    hasError: boolean;
    message?: string;
}

/**
 * Oyunları saran hata sınırı (error boundary). Bir oyun çalışırken beklenmedik
 * bir hata verirse TÜM uygulama beyaz ekrana düşmez; onun yerine çocuk dostu bir
 * "menüye dön" ekranı gösterilir. Ticari ürün dayanıklılığı için kritik.
 *
 * Kullanım: render noktasında <GameErrorBoundary key={routeKey} onExit={...}>{oyun}</GameErrorBoundary>
 * (key => her oyuna taze sınır; önceki hatanın yeni oyuna taşınmasını önler.)
 *
 * Not: Error boundary'ler React'te YALNIZCA class bileşenlerle yazılabilir.
 */
export default class GameErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error?.message };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Geliştirme/izleme için logla (kullanıcıya gösterilmez)
        console.error(`🎮 Oyun hatası${this.props.gameName ? ` (${this.props.gameName})` : ''}:`, error, info?.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.emoji}>😅</Text>
                    <Text style={styles.title}>Bir şeyler ters gitti</Text>
                    <Text style={styles.subtitle}>
                        Bu oyun beklenmedik şekilde durdu. Menüye dönüp başka bir oyun seçebilir
                        veya tekrar deneyebilirsin.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={this.props.onExit} activeOpacity={0.85}>
                        <Text style={styles.buttonText}>🏠 Menüye Dön</Text>
                    </TouchableOpacity>
                    {__DEV__ && !!this.state.message && (
                        <Text style={styles.debug}>{this.state.message}</Text>
                    )}
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF9E6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        maxWidth: 420,
        width: '100%',
        ...Platform.select({
            web: { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' } as any,
            default: { elevation: 6 },
        }),
    },
    emoji: { fontSize: 64, marginBottom: 8 },
    title: { fontSize: 22, fontWeight: '800', color: '#3e2723', marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#6d4c41', textAlign: 'center', lineHeight: 21, marginBottom: 22 },
    button: {
        backgroundColor: '#1E88E5',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    debug: { marginTop: 16, fontSize: 11, color: '#b0a89f', textAlign: 'center' },
});
