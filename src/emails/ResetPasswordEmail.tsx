import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface ResetPasswordEmailProps {
  userName: string;
  resetUrl: string;
  libraryName?: string;
}

export const ResetPasswordEmail = ({
  userName,
  resetUrl,
  libraryName,
}: ResetPasswordEmailProps) => {
  const previewText = `Reset your password for ${libraryName || 'BookMyLib'}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 my-auto mx-auto font-sans px-2">
          <Container className="bg-white border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[600px] w-full shadow-sm">
            {/* Header */}
            <Section className="text-center mt-[20px] mb-[20px]">
              <Heading className="text-black text-[24px] font-bold p-0 my-0 mx-0 tracking-tight">
                BookMyLib
              </Heading>
              {libraryName && (
                <Text className="text-gray-500 text-[14px] italic p-0 my-0 mx-0">
                  {libraryName}
                </Text>
              )}
            </Section>
            
            <Hr className="border-t border-gray-200 my-4" />

            {/* Title */}
            <Section className="mt-[20px] text-center">
              <Heading className="text-gray-800 text-[22px] font-normal p-0 my-[10px] mx-0">
                Reset Your Password
              </Heading>
              <Text className="text-gray-500 text-[14px]">
                Hello <strong>{userName}</strong>,
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="mb-[32px] px-4 text-center">
              <Text className="text-gray-700 text-[15px] leading-[24px]">
                We received a request to reset your password. If you didn&apos;t make this request, you can safely ignore this email.
              </Text>
              
              <Section className="mt-[24px] mb-[24px]">
                <Button
                  className="bg-black text-white rounded px-6 py-3 font-semibold text-[14px] no-underline hover:bg-gray-800 transition-colors"
                  href={resetUrl}
                >
                  Reset Password
                </Button>
              </Section>

              <Text className="text-gray-500 text-[13px] leading-[20px]">
                Or copy and paste this link into your browser:
                <br />
                <Link href={resetUrl} className="text-blue-600 no-underline break-all">
                  {resetUrl}
                </Link>
              </Text>

              <Text className="text-gray-500 text-[13px] mt-4">
                This link will expire in 1 hour.
              </Text>
            </Section>

            <Hr className="border-t border-gray-200 my-6" />
            
            {/* Footer */}
            <Section className="text-center mt-[20px]">
                <Text className="text-gray-400 text-[12px] mb-1">
                    Secure Password Reset
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

export default ResetPasswordEmail;
