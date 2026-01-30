import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
  Link,
} from "@react-email/components";
import * as React from "react";

interface ReceiptEmailProps {
  studentName: string;
  studentEmail?: string;
  amount: number;
  date: string;
  invoiceNo: string;
  planName: string;
  duration: string;
  branchName: string;
  paymentMethod: string;
  receiptUrl?: string;
}

export const ReceiptEmail = ({
  studentName,
  studentEmail,
  amount,
  date,
  invoiceNo,
  planName,
  duration,
  branchName,
  paymentMethod,
  receiptUrl,
}: ReceiptEmailProps) => {
  const previewText = `Payment Receipt - ${invoiceNo}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 my-auto mx-auto font-sans">
          <Container className="bg-white border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px] shadow-sm">
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

            {/* Receipt Title */}
            <Section className="mb-[20px] text-center">
              <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-2">
                Payment Confirmation
              </Text>
              <Heading className="text-black text-[32px] font-normal p-0 my-0 mx-0">
                ₹{amount}
              </Heading>
              <Text className="text-gray-400 text-[14px] mt-1">
                Paid on {date}
              </Text>
            </Section>
            
            <Section className="mb-[24px]">
               <Text className="text-gray-700 text-[15px] leading-[24px]">
                Hi <strong>{studentName}</strong>,
              </Text>
              <Text className="text-gray-700 text-[15px] leading-[24px]">
                Thanks for your payment. Your subscription has been activated successfully.
              </Text>
            </Section>

            {/* Order Summary */}
            <Section className="border border-solid border-gray-200 rounded-lg overflow-hidden mb-[32px]">
              <div className="bg-gray-50 p-3 border-b border-gray-200">
                <Text className="text-gray-500 text-[12px] font-semibold uppercase tracking-wider m-0">
                  Order Summary
                </Text>
              </div>
              <div className="p-4">
                <Row className="mb-3">
                    <Column>
                        <Text className="text-gray-600 text-[14px] m-0 font-medium">{planName}</Text>
                        <Text className="text-gray-400 text-[12px] m-0">Duration: {duration}</Text>
                    </Column>
                    <Column align="right">
                        <Text className="text-black text-[14px] font-semibold m-0">₹{amount}</Text>
                    </Column>
                </Row>
                <Hr className="border-gray-100 my-3" />
                <Row>
                    <Column>
                        <Text className="text-gray-500 text-[14px] m-0 font-medium">Total</Text>
                    </Column>
                    <Column align="right">
                        <Text className="text-black text-[16px] font-bold m-0">₹{amount}</Text>
                    </Column>
                </Row>
              </div>
            </Section>

            {/* Billing Details */}
            <Section className="mb-[32px]">
              <Row>
                <Column className="w-1/2 align-top">
                  <Text className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold mb-2">
                    Billed To
                  </Text>
                  <Text className="text-black text-[14px] m-0 font-medium">
                    {studentName}
                  </Text>
                  {studentEmail && (
                    <Text className="text-gray-500 text-[14px] m-0">
                        {studentEmail}
                    </Text>
                  )}
                </Column>
                <Column className="w-1/2 align-top pl-4">
                  <Text className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold mb-2">
                    Payment Details
                  </Text>
                  <Text className="text-gray-600 text-[14px] m-0">
                    <span className="text-gray-400">Invoice No:</span> {invoiceNo}
                  </Text>
                   <Text className="text-gray-600 text-[14px] m-0">
                    <span className="text-gray-400">Method:</span> {paymentMethod}
                  </Text>
                  <Text className="text-gray-600 text-[14px] m-0">
                    <span className="text-gray-400">Branch:</span> {branchName}
                  </Text>
                </Column>
              </Row>
            </Section>

            {receiptUrl && (
                <Section className="text-center mb-[32px]">
                    <Link href={receiptUrl} className="text-blue-600 text-[14px] underline">
                        Download Receipt PDF
                    </Link>
                </Section>
            )}

            <Hr className="border-t border-gray-200 my-6" />

            {/* Footer */}
            <Section className="text-center mt-[20px]">
                 <Text className="text-gray-500 text-[12px] mb-2">
                    Powered by <strong>BookMyLib</strong>
                </Text>
                {branchName && (
                    <Text className="text-gray-400 text-[12px] mb-1">
                        Processed by {branchName}
                    </Text>
                )}
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

export default ReceiptEmail;
