"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  senderOfficeId: z.string().min(1, "يجب اختيار المكتب المرسل"),
  receiverOfficeId: z.string().min(1, "يجب اختيار المكتب المستلم"),
  amount: z.number().min(0.01, "يجب أن يكون المبلغ أكبر من 0"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Office {
  id: string;
  name: string;
  code: string;
  currentBalance: number;
}

export default function BetweenOfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const senderOfficeId = watch("senderOfficeId");
  const receiverOfficeId = watch("receiverOfficeId");

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const response = await fetch("/api/offices");
      if (response.ok) {
        const data = await response.json();
        setOffices(data);
      }
    } catch (error) {
      console.error("Error fetching offices:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (data.senderOfficeId === data.receiverOfficeId) {
      toast.error("لا يمكن التحويل لنفس المكتب");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/transfers/between-offices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("تم إنشاء التحويل بنجاح");
        reset();
        fetchOffices(); // تحديث الأرصدة
      } else {
        const error = await response.json();
        toast.error(error.message || "حدث خطأ أثناء إنشاء التحويل");
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("حدث خطأ أثناء إنشاء التحويل");
    } finally {
      setLoading(false);
    }
  };

  const selectedSender = offices.find(o => o.id === senderOfficeId);
  const selectedReceiver = offices.find(o => o.id === receiverOfficeId);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>شحن أموال بين الفروع</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senderOfficeId">المكتب المرسل</Label>
                <Select onValueChange={(value) => setValue("senderOfficeId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المكتب المرسل" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name} ({office.code}) - رصيد: {office.currentBalance.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.senderOfficeId && (
                  <p className="text-red-500 text-sm">{errors.senderOfficeId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="receiverOfficeId">المكتب المستلم</Label>
                <Select onValueChange={(value) => setValue("receiverOfficeId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المكتب المستلم" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name} ({office.code}) - رصيد: {office.currentBalance.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.receiverOfficeId && (
                  <p className="text-red-500 text-sm">{errors.receiverOfficeId.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="amount">المبلغ</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
                placeholder="أدخل المبلغ"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="أدخل ملاحظات إضافية (اختياري)"
              />
            </div>

            {selectedSender && selectedReceiver && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">معاينة التحويل:</h3>
                <p>من: {selectedSender.name} (رصيد حالي: {selectedSender.currentBalance.toFixed(2)})</p>
                <p>إلى: {selectedReceiver.name} (رصيد حالي: {selectedReceiver.currentBalance.toFixed(2)})</p>
                <p>المبلغ: {watch("amount") || 0}</p>
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "جاري الإنشاء..." : "إنشاء التحويل"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}