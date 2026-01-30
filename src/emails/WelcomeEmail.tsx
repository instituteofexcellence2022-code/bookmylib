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
  Button,
  Hr,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  studentName: string;
  studentEmail?: string;
  loginUrl: string;
  libraryName?: string;
}

export const WelcomeEmail = ({
  studentName,
  studentEmail,
  loginUrl,
  libraryName,
}: WelcomeEmailProps) => {
  const previewText = `Welcome to ${libraryName || 'BookMyLib'}!`;

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
              <Text className="text-gray-500 text-[14px] italic p-0 my-0 mx-0">
                Your Premium Library Experience
              </Text>
            </Section>
            
            <Hr className="border-t border-gray-200 my-4" />

            {/* Welcome Banner/Title */}
            <Section className="mt-[20px] text-center">
              <Heading className="text-gray-800 text-[22px] font-normal p-0 my-[10px] mx-0">
                Welcome to the Community!
              </Heading>
              <Text className="text-gray-500 text-[14px]">
                We&apos;re thrilled to have you with us, <strong>{studentName}</strong>.
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="mb-[32px] px-4">
              <Text className="text-gray-700 text-[15px] leading-[24px]">
                Your account has been successfully created. You now have access to premium library facilities designed to help you focus and achieve your goals.
              </Text>
              
              {/* Account Details Box */}
              <Section className="bg-gray-50 rounded-lg p-4 border border-gray-100 my-4">
                <Text className="text-gray-500 text-[12px] uppercase tracking-wider font-semibold mb-2">
                    Account Details
                </Text>
                <Row>
                    <Column>
                        <Text className="text-gray-600 text-[14px] m-0">Username/Email:</Text>
                        <Text className="text-black text-[14px] font-medium m-0">{studentEmail || 'Your registered email'}</Text>
                    </Column>
                </Row>
              </Section>

              <Text className="text-gray-700 text-[15px] leading-[24px] mt-4">
                Here are a few things you can do right away:
              </Text>
              
              <ul className="text-gray-700 text-[14px] pl-5 leading-[24px]">
                <li className="mb-2">Log in to your student dashboard.</li>
                <li className="mb-2">Explore our subscription plans and amenities.</li>
                <li className="mb-2">Manage your profile and track your attendance.</li>
              </ul>
            </Section>

            {/* CTA */}
            <Section className="text-center mb-[32px]">
              <Button
                className="bg-black text-white rounded px-6 py-3 font-semibold text-[14px] no-underline hover:bg-gray-800 transition-colors"
                href={loginUrl}
              >
                Access Student Portal
              </Button>
            </Section>

            <Hr className="border-t border-gray-200 my-6" />
            
            {/* Footer */}
            <Section className="text-center mt-[20px]">
                <Text className="text-gray-500 text-[12px] mb-2">
                    Powered by <strong>BookMyLib</strong>
                </Text>
                {libraryName && (
                    <Text className="text-gray-400 text-[12px] mb-1">
                        Welcome to {libraryName}
                    </Text>
                )}
                <Text className="text-gray-400 text-[11px] mt-2">
                    If you have any questions, simply reply to this email or contact support.
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

export default WelcomeEmail;
