import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Tailwind,
  Row,
  Column,
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
  renewLink = "https://bookmylib.com/student/payments", // Fallback URL
  branchName,
}: SubscriptionExpiryEmailProps) => {
  const isUrgent = daysLeft <= 3;
  const previewText = `Action Required: Subscription Expiring in ${daysLeft} Days`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 my-auto mx-auto font-sans px-2">
          <Container className="bg-white border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px] w-full shadow-sm">
             {/* Header */}
            <Section className="text-center mt-[20px] mb-[20px]">
              <Heading className="text-black text-[24px] font-bold p-0 my-0 mx-0 tracking-tight">
                BookMyLib
              </Heading>
              <Text className="text-gray-500 text-[14px] italic p-0 my-0 mx-0">
                Your Premium Library Experience
              </Text>
            </Section>

            <Hr className="border-t border-gray-200 my-4" />

            {/* Urgency Banner */}
            <Section className={`text-center p-4 rounded-lg mb-[24px] ${isUrgent ? 'bg-red-50 border border-red-100' : 'bg-orange-50 border border-orange-100'}`}>
              <Heading className={`text-[18px] font-semibold m-0 ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
                Subscription Expiring Soon
              </Heading>
              <Text className={`text-[14px] m-0 mt-1 ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                {daysLeft === 0 ? 'Expires Today!' : `Only ${daysLeft} days remaining`}
              </Text>
            </Section>
            
            <Section className="mb-[24px] px-2">
               <Text className="text-gray-700 text-[15px] leading-[24px]">
                Hello <strong>{studentName}</strong>,
              </Text>
              <Text className="text-gray-700 text-[15px] leading-[24px]">
                This is a friendly reminder that your <strong>{planName}</strong> subscription at <strong>{branchName}</strong> is scheduled to expire on:
              </Text>
              
              <Section className="bg-gray-50 rounded p-3 text-center my-4 border border-gray-100">
                <Text className="text-black text-[16px] font-bold m-0">
                    {expiryDate}
                </Text>
              </Section>

              <Text className="text-gray-700 text-[15px] leading-[24px]">
                To avoid any interruption in your library access and services, please renew your subscription before the expiry date.
              </Text>
            </Section>

            {/* Why Renew Section */}
            <Section className="mb-[32px] px-2">
                <Text className="text-gray-500 text-[12px] uppercase tracking-wider font-semibold mb-2">
                    Why Renew?
                </Text>
                <ul className="text-gray-600 text-[14px] pl-5 m-0 leading-[24px]">
                    <li className="mb-1">Keep your reserved seat/spot.</li>
                    <li className="mb-1">Continue enjoying high-speed Wi-Fi & amenities.</li>
                    <li className="mb-1">Maintain your attendance streak.</li>
                </ul>
            </Section>

            <Section className="text-center mb-[32px]">
              <Button
                className={`rounded text-white text-[14px] font-semibold no-underline text-center px-6 py-3 transition-colors ${isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}
                href={renewLink}
              >
                Renew Subscription Now
              </Button>
            </Section>

            <Hr className="border-t border-gray-200 my-6" />

            {/* Footer */}
            <Section className="text-center mt-[20px]">
                <Text className="text-gray-500 text-[12px] mb-2">
                    Powered by <strong>BookMyLib</strong>
                </Text>
                {branchName && (
                    <Text className="text-gray-400 text-[12px] mb-1">
                        Sent from {branchName}
                    </Text>
                )}
                <Text className="text-gray-400 text-[11px] mt-2">
                    If you have already renewed, please ignore this message.
                </Text>
                 <Text className="text-gray-300 text-[10px] mt-4">
                    © {new Date().getFullYear()} BookMyLib. All rights reserved.
                </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SubscriptionExpiryEmail;
