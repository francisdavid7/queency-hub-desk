import { ActionForm, SubmitButton } from "@/components/admin/form-controls";
import { PageHeader } from "@/components/admin/widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveSettingsAction } from "@/lib/admin/actions";
import { getBusinessSettings } from "@/lib/settings";

const fields = [
  { name: "businessName", label: "Business name", required: true },
  { name: "address", label: "Address" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "receiptFooter", label: "Receipt footer message" },
] as const;

export default async function AdminSettingsPage() {
  const settings = await getBusinessSettings();
  return (
    <>
      <PageHeader title="Settings" description="Business details printed on every receipt." />
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <ActionForm action={saveSettingsAction} resetOnSuccess={false} className="space-y-4">
            {fields.map((field) => (
              <label key={field.name} className="block space-y-1 text-sm font-medium">
                <span>{field.label}</span>
                <Input
                  name={field.name}
                  defaultValue={settings[field.name] ?? ""}
                  required={"required" in field}
                />
              </label>
            ))}
            <SubmitButton>Save settings</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
