import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Trash2,
  Loader2,
  Plus,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  BookOpen,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { insertOpportunitySchema, type Opportunity } from "@shared/schema";

const formSchema = insertOpportunitySchema.extend({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Please enter a valid email"),
  address: z.string().min(1, "Address is required"),
  availability: z.string().min(1, "Availability is required"),
});

export default function Opportunities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: [api.opportunities.list.path],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      availability: "",
      knowledgeBase: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await apiRequest(
        "POST",
        api.opportunities.create.path,
        values,
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "Your details have been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [api.opportunities.list.path],
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create user",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(
        "DELETE",
        buildUrl(api.opportunities.delete.path, { id }),
      );
    },
    onSuccess: () => {
      toast({
        title: "User removed",
        description: "The entry has been deleted.",
      });
      queryClient.invalidateQueries({
        queryKey: [api.opportunities.list.path],
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "POST",
        buildUrl(api.opportunities.activate.path, { id }),
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile selected",
        description: "This profile is now active for calls.",
      });
      queryClient.invalidateQueries({
        queryKey: [api.opportunities.list.path],
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1
          className="text-3xl font-bold font-display text-foreground"
          data-testid="text-page-title"
        >
          Users
        </h1>
        <p className="text-muted-foreground text-lg">
          Add your details to create a call opportunity for the AI agent.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border/50 shadow-sm shadow-black/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold font-display flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              New User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your full name"
                          {...field}
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+44 7700 900000"
                          type="tel"
                          {...field}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your address"
                          {...field}
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Availability
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Weekdays 9am-5pm, Saturdays"
                          {...field}
                          data-testid="input-availability"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="knowledgeBase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        Knowledge Base
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any specific information or notes you want the AI agent to include when calling..."
                          className="min-h-[100px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-knowledge-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-opportunity"
                >
                  {createMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Create User</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2
            className="text-xl font-bold font-display text-foreground"
            data-testid="text-saved-title"
          >
            Saved Users
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : opportunities.length === 0 ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <User className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">
                  No users yet
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Fill out the form to create your first one.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <Card
                  key={opp.id}
                  className={`border-border/50 shadow-sm shadow-black/5 hover:shadow-md transition-all cursor-pointer ${
                    opp.active ? "ring-2 ring-primary border-primary/40" : ""
                  }`}
                  data-testid={`card-opportunity-${opp.id}`}
                  onClick={() => {
                    if (!opp.active) activateMutation.mutate(opp.id);
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            opp.active
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          }`}
                          data-testid={`toggle-active-${opp.id}`}
                        >
                          {opp.active && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className="font-bold text-foreground truncate"
                              data-testid={`text-name-${opp.id}`}
                            >
                              {opp.name}
                            </h3>
                            {opp.active && (
                              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" />
                              <span className="truncate">{opp.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{opp.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{opp.address}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="truncate">
                                {opp.availability}
                              </span>
                            </div>
                          </div>
                          {opp.knowledgeBase && (
                            <div className="flex items-start gap-1.5 text-sm text-muted-foreground mt-1">
                              <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">
                                {opp.knowledgeBase}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(opp.id);
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-opportunity-${opp.id}`}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
