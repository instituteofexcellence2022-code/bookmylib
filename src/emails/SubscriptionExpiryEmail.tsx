import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface SubscriptionExpiryEmailProps {
  studentName: string;
  planName: string;
  expiryDate: string;
  daysLeft: number;
  renewLink?: string;
  branchName: string;
}

export const SubscriptionExpiryEmail = ({
  studentName,
  planName,
  expiryDate,
  daysLeft,
  renewLink = "https://library-app.com/student/payments", // Fallback URL
  branchName,
}: SubscriptionExpiryEmailProps) => {
  const previewText = `Action Required: Subscription Expiring in ${daysLeft} Days`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Text className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                Subscription Expiring Soon
              </Text>
            </Section>
            
            <Section className="mb-[32px]">
               <Text className="text-black text-[14px] leading-[24px]">
                Hello <strong>{studentName}</strong>,
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                This is a reminder that your <strong>{planName}</strong> subscription at <strong>{branchName}</strong> is expiring in <strong>{daysLeft} days</strong>.
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                Expiry Date: <strong>{expiryDate}</strong>
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                To ensure uninterrupted access to the library facilities, please renew your subscription before the expiry date.
              </Text>
            </Section>

            <Section className="text-center mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={renewLink}
              >
                Renew Subscription
              </Button>
            </Section>

            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />

            <Section className="text-center">
                <Text className="text-gray-500 text-[12px]">
                    If you have already renewed, please ignore this message.
                </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SubscriptionExpiryEmail;
