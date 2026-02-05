import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface EmailVerificationEmailProps {
  userName: string;
  otp: string;
  libraryName?: string;
}

export const EmailVerificationEmail = ({
  userName,
  otp,
  libraryName,
}: EmailVerificationEmailProps) => {
  const previewText = `Verify your email for ${libraryName || 'BookMyLib'}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 my-auto mx-auto font-sans px-2">
          <Container className="bg-white border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[600px] w-full shadow-sm">
            <Section className="text-center mt-[20px] mb-[20px]">
              <Heading className="text-black text-[24px] font-bold p-0 my-0 mx-0 tracking-tight">
                BookMyLib
              </Heading>
              <Text className="text-gray-500 text-[14px] italic p-0 my-0 mx-0">
                Your Premium Library Experience
              </Text>
            </Section>
            
            <Hr className="border-t border-gray-200 my-4" />

            <Section className="mt-[20px] text-center">
              <Heading className="text-gray-800 text-[22px] font-normal p-0 my-[10px] mx-0">
                Verify Your Email
              </Heading>
              <Text className="text-gray-500 text-[14px]">
                Hello <strong>{userName}</strong>,
              </Text>
            </Section>

            <Section className="mb-[32px] px-4 text-center">
              <Text className="text-gray-700 text-[15px] leading-[24px]">
                Use the OTP code below to verify your email and activate your account.
              </Text>
              
              <Section className="mt-[24px] mb-[24px]">
                <Text className="bg-gray-100 text-black text-[32px] font-bold tracking-[8px] py-4 px-8 rounded-lg border border-gray-200 inline-block">
                  {otp}
                </Text>
              </Section>

              <Text className="text-gray-500 text-[13px] mt-4">
                This code will expire in 15 minutes.
              </Text>
            </Section>

            <Hr className="border-t border-gray-200 my-6" />
            
            <Section className="text-center mt-[20px]">
                <Text className="text-gray-400 text-[12px] mb-1">
                    Email Verification
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

export default EmailVerificationEmail;
