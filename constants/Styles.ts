import Colors from "./colors";

export const commonCardStyle = {
  backgroundColor: Colors.background,
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  elevation: 3, // Android shadow
  shadowColor: '#000', // iOS shadow
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
};