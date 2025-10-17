import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PaymentMethod } from "@/hooks/use-payment-methods";
import { Card, CardContent } from "@/components/ui/card";

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  selectedMethod: string | null;
  onSelectMethod: (methodId: string) => void;
}

export function PaymentMethodSelector({
  paymentMethods,
  selectedMethod,
  onSelectMethod
}: PaymentMethodSelectorProps) {
  return (
    <RadioGroup
      value={selectedMethod || undefined}
      onValueChange={onSelectMethod}
      className="space-y-3"
    >
      {paymentMethods.map((method) => (
        <div key={method.id} className="flex items-center space-x-2">
          <Card className={`w-full cursor-pointer hover:border-primary transition-colors ${selectedMethod === method.id ? 'border-primary' : ''}`}>
            <CardContent className="p-4">
              <RadioGroupItem
                value={method.id}
                id={`payment-${method.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`payment-${method.id}`}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {method.id === 'stripe' && (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <i className="ri-bank-card-line text-2xl text-blue-600"></i>
                    </div>
                  )}
                  {method.id === 'mercadopago' && (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <i className="ri-bank-card-line text-2xl text-blue-500"></i>
                    </div>
                  )}
                  {method.id === 'paypal' && (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <i className="ri-paypal-line text-2xl text-blue-700"></i>
                    </div>
                  )}
                  {method.id === 'moyasar' && (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <i className="ri-bank-card-line text-2xl text-green-600"></i>
                    </div>
                  )}
                  {method.id === 'mpesa' && (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <i className="ri-smartphone-line text-2xl text-green-500"></i>
                    </div>
                  )}
                  {method.id === 'bank-transfer' && (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <i className="ri-bank-line text-2xl text-green-600"></i>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{method.name}</div>
                    <div className="text-sm text-muted-foreground">{method.description}</div>
                    {method.testMode && (
                      <div className="text-xs text-amber-600 mt-1">Test Mode Enabled</div>
                    )}
                  </div>
                </div>
                <div className="h-4 w-4 rounded-full border border-primary flex items-center justify-center">
                  {selectedMethod === method.id && (
                    <div className="h-2 w-2 rounded-full bg-primary btn-brand-primary "></div>
                  )}
                </div>
              </Label>
            </CardContent>
          </Card>
        </div>
      ))}
    </RadioGroup>
  );
}
