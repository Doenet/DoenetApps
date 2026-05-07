import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  VStack,
} from "@chakra-ui/react";

export type Alert = {
  id: string;
  type: "info" | "warning" | "success" | "error" | "loading" | undefined;
  title: string;
  description: string;
  stage?: number;
};

export function AlertQueue({ alerts = [] }: { alerts: Alert[] }) {
  return (
    <VStack spacing={2} width="100%">
      {alerts.map(({ type, title, description, id }) => {
        return (
          <Alert key={`alert${id}`} status={type}>
            <AlertIcon />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </Alert>
        );
      })}
    </VStack>
  );
}
