import {
  Body,
  Container,
  Column,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface ReceiptEmailProps {
  studentName: string;
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
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Text className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                Payment Receipt
              </Text>
            </Section>
            
            <Section className="mb-[32px]">
               <Text className="text-black text-[14px] leading-[24px]">
                Hello <strong>{studentName}</strong>,
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                Thank you for your payment. Here are the details of your transaction.
              </Text>
            </Section>

            <Section className="border border-solid border-[#eaeaea] rounded-lg p-4 bg-gray-50 mb-[32px]">
              <Row>
                <Column>
                  <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-1">Amount Paid</Text>
                  <Text className="text-black text-[24px] font-bold m-0">₹{amount}</Text>
                </Column>
              </Row>
            </Section>

            <Section className="mb-[32px]">
              <Row className="mb-2">
                <Column>
                  <Text className="text-gray-500 text-[14px] m-0">Invoice No</Text>
                </Column>
                <Column align="right">
                  <Text className="text-black text-[14px] font-medium m-0">{invoiceNo}</Text>
                </Column>
              </Row>
              <Row className="mb-2">
                <Column>
                  <Text className="text-gray-500 text-[14px] m-0">Date</Text>
                </Column>
                <Column align="right">
                  <Text className="text-black text-[14px] font-medium m-0">{date}</Text>
                </Column>
              </Row>
              <Row className="mb-2">
                <Column>
                  <Text className="text-gray-500 text-[14px] m-0">Plan</Text>
                </Column>
                <Column align="right">
                  <Text className="text-black text-[14px] font-medium m-0">{planName}</Text>
                </Column>
              </Row>
              <Row className="mb-2">
                <Column>
                  <Text className="text-gray-500 text-[14px] m-0">Branch</Text>
                </Column>
                <Column align="right">
                  <Text className="text-black text-[14px] font-medium m-0">{branchName}</Text>
                </Column>
              </Row>
              <Row className="mb-2">
                <Column>
                  <Text className="text-gray-500 text-[14px] m-0">Payment Method</Text>
                </Column>
                <Column align="right">
                  <Text className="text-black text-[14px] font-medium m-0 uppercase">{paymentMethod}</Text>
                </Column>
              </Row>
            </Section>

            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />

            <Section className="text-center">
                <Text className="text-gray-500 text-[12px]">
                    If you have any questions, please contact support.
                </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ReceiptEmail;
