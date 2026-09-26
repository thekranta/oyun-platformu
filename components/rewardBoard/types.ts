// Sınıf Bahçesi: ödül panosunun görsel "konsept"leri (bitki/gökyüzü/...) için ortak
// sözleşme. TeacherRewardBoard ve VeliDashboard yalnız bu arayüz üzerinden çalışır,
// aktif konsept hangisiyse bakmaz — yeni bir konsept eklemek yalnız conceptRegistry.ts'e
// bir satır eklemektir (bkz. memory: oyun-varyant-deseni, aynı prensip).

import type { ComponentType } from 'react';

export type RewardStage = 0 | 1 | 2 | 3;

// SÜRDÜRME: bu liste supabase_migrations/add_class_rewards.sql'deki
// classes.reward_theme CHECK kısıtıyla ELLE senkron tutulur.
export type RewardConceptId = 'bitki' | 'gokyuzu';

export interface RewardConceptArtProps {
    stage: RewardStage;
    size: number;
    /** Her artışta bir kez arttırılır: "ödül verildi" mikro-animasyonunu (damla/yıldız tozu) tetikler. */
    awardPulse?: number;
    /** Her aşama atlamasında bir kez arttırılır: kutlama efektini (kıvılcım patlaması) tetikler. */
    celebrate?: number;
}

export interface RewardConcept {
    id: RewardConceptId;
    /** Segmented control'de görünen ad, ör. "Bitki". */
    label: string;
    /** private.reward_stage() ile AYNI 4 eşiğin (0/1-2/3-5/6+) etiketleri. */
    stageLabels: readonly [string, string, string, string];
    /** Kart/hero vurgu rengi — yalnız bu konseptin sahne sanatında kullanılır, buton/odak
     * halkası gibi UI-chrome renkleri TÜM konseptlerde ortak kalır (öğrenilmiş davranış bozulmasın). */
    accentColor: string;
    /** Saf büyüme illüstrasyonu — buton/başlık İÇERMEZ, yalnız SVG. */
    Art: ComponentType<RewardConceptArtProps>;
}
