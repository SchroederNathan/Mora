import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { radius, spacing, useTheme } from '@/theme'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [barcode, setBarcode] = useState('')
  const theme = useTheme()
  const open = (value: string) => {
    if (scanned || !/^\d{8,14}$/.test(value)) return
    setScanned(true)
    router.replace({ pathname: '/food-library', params: { barcode: value } })
  }
  return (
    <Screen
      title="Scan a barcode"
      subtitle="Hold the barcode inside the camera view, or enter its numbers below."
      header={false}
    >
      {permission?.granted ? (
        <View
          style={{
            height: 280,
            borderRadius: radius.lg,
            overflow: 'hidden',
            backgroundColor: theme.muted,
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={scanned ? undefined : (event) => open(event.data)}
          />
        </View>
      ) : (
        <Button
          title="Allow camera access"
          onPress={() => {
            void requestPermission()
          }}
        />
      )}
      {permission && !permission.granted && !permission.canAskAgain && (
        <Text tone="muted">
          Camera access is off. Enable it in your device settings, or enter the barcode below.
        </Text>
      )}
      <View style={{ gap: spacing.lg }}>
        <Field
          label="Barcode number"
          keyboardType="number-pad"
          value={barcode}
          onChangeText={setBarcode}
          maxLength={14}
        />
        <Button
          title="Look up barcode"
          disabled={!/^\d{8,14}$/.test(barcode)}
          onPress={() => open(barcode)}
        />
      </View>
    </Screen>
  )
}
