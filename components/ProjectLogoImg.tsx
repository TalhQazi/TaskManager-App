import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

// optional: keep same logic if you already have it in web
const toProxiedUrl = (url?: string) => url;

export function ProjectLogoImg({
  projectId,
  projectName,
  logoUrl,
}: {
  projectId: string;
  projectName: string;
  logoUrl?: string;
}) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (logoUrl && logoUrl.length > 0) {
      setSrc(toProxiedUrl(logoUrl) || logoUrl);
      setError(false);
      return;
    }

    let cancelled = false;
    setSrc(undefined);

    apiRequest<{ logo: { url: string } }>(
      `/api/projects/${encodeURIComponent(projectId)}/logo`
    )
      .then((res) => {
        if (!cancelled) {
          const url = res.data?.logo?.url;
          setSrc(url ? toProxiedUrl(url) : null);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, logoUrl]);

  // ✅ LOADING STATE
  if (src === undefined) {
    return <View style={styles.skeleton} />;
  }

  // ✅ IMAGE STATE
  if (src && !error) {
    return (
      <Image
        source={{ uri: src }}
        style={styles.logo}
        resizeMode="cover"
        onError={() => setError(true)}
      />
    );
  }

  // ✅ FALLBACK INITIALS
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>
        {projectName.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
  },

  skeleton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },

  fallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1f6feb20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f6feb40',
  },

  fallbackText: {
    color: '#1f6feb',
    fontSize: 12,
    fontWeight: '800',
  },
});