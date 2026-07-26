import { Box, color, Text } from '$components/ui';
import { sizedIcon, Warning } from '$components/icons/phosphor';

export function FieldError({ message }: { message: string }) {
  return (
    <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
      {sizedIcon(Warning, '50', { filled: true })}
      <Text size="T200">
        <b>{message}</b>
      </Text>
    </Box>
  );
}
