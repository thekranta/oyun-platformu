import VeliDashboard from '@/components/VeliDashboard';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

export default function VeliDashboardPage() {
    const router = useRouter();

    // Bu değerler normalde login'den veya context'ten gelir
    // Şimdilik örnek değerler kullanıyoruz
    const [childName] = useState('Test');
    const [childAge] = useState(60);
    const [email] = useState('test@test.com');

    return (
        <VeliDashboard
            childName={childName}
            childAge={childAge}
            email={email}
            onClose={() => router.back()}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
